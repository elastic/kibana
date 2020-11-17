/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { flattenCaseSavedObject, transformNewComment } from '../../routes/api/utils';

import {
  throwErrors,
  CaseResponseRt,
  CommentRequestRt,
  CaseResponse,
  decodeComment,
} from '../../../common/api';
import { buildCommentUserActionItem } from '../../services/user_actions/helpers';

import { CaseClientAddComment, CaseClientFactoryArguments } from '../types';
import { CASE_SAVED_OBJECT } from '../../saved_object_types';

export const addComment = ({
  savedObjectsClient,
  caseService,
  userActionService,
  request,
}: CaseClientFactoryArguments) => async ({
  caseId,
  comment,
}: CaseClientAddComment): Promise<CaseResponse> => {
  const query = pipe(
    // TODO: Excess CommentRequestRt when the excess() function supports union types
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  decodeComment(comment.type, comment);

  const myCase = await caseService.getCase({
    client: savedObjectsClient,
    caseId,
  });

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = await caseService.getUser({ request });
  const createdDate = new Date().toISOString();

  const [newComment, updatedCase] = await Promise.all([
    caseService.postNewComment({
      client: savedObjectsClient,
      attributes: transformNewComment({
        createdDate,
        ...query,
        username,
        full_name,
        email,
      }),
      references: [
        {
          type: CASE_SAVED_OBJECT,
          name: `associated-${CASE_SAVED_OBJECT}`,
          id: myCase.id,
        },
      ],
    }),
    caseService.patchCase({
      client: savedObjectsClient,
      caseId,
      updatedAttributes: {
        updated_at: createdDate,
        updated_by: { username, full_name, email },
      },
      version: myCase.version,
    }),
  ]);

  const totalCommentsFindByCases = await caseService.getAllCaseComments({
    client: savedObjectsClient,
    caseId,
    options: {
      fields: [],
      page: 1,
      perPage: 1,
    },
  });

  const [comments] = await Promise.all([
    caseService.getAllCaseComments({
      client: savedObjectsClient,
      caseId,
      options: {
        fields: [],
        page: 1,
        perPage: totalCommentsFindByCases.total,
      },
    }),
    userActionService.postUserActions({
      client: savedObjectsClient,
      actions: [
        buildCommentUserActionItem({
          action: 'create',
          actionAt: createdDate,
          actionBy: { username, full_name, email },
          caseId: myCase.id,
          commentId: newComment.id,
          fields: ['comment'],
          newValue: JSON.stringify(query),
        }),
      ],
    }),
  ]);

  return CaseResponseRt.encode(
    flattenCaseSavedObject({
      savedObject: {
        ...myCase,
        ...updatedCase,
        attributes: { ...myCase.attributes, ...updatedCase.attributes },
        version: updatedCase.version ?? myCase.version,
        references: myCase.references,
      },
      comments: comments.saved_objects,
    })
  );
};
