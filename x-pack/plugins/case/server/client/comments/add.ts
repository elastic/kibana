/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { decodeComment, flattenCaseSavedObject, transformNewComment } from '../../routes/api/utils';

import {
  throwErrors,
  CaseResponseRt,
  CommentRequestRt,
  CaseResponse,
  CommentType,
  CaseStatuses,
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
  caseClient,
  caseId,
  comment,
}: CaseClientAddComment): Promise<CaseResponse> => {
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  decodeComment(comment);

  const myCase = await caseService.getCase({
    client: savedObjectsClient,
    caseId,
  });

  // An alert cannot be attach to a closed case.
  if (query.type === CommentType.alert && myCase.attributes.status === CaseStatuses.closed) {
    throw Boom.badRequest('Alert cannot be attached to a closed case');
  }

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

  // If the case is synced with alerts the newly attached alert must match the status of the case.
  if (newComment.attributes.type === CommentType.alert && myCase.attributes.settings.syncAlerts) {
    caseClient.updateAlertsStatus({
      ids: [newComment.attributes.alertId],
      status: myCase.attributes.status,
    });
  }

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
