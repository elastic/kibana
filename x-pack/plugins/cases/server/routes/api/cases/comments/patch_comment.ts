/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { CommentableCase } from '../../../../common';
import { CommentPatchRequestRt, throwErrors, User } from '../../../../../common';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError, decodeCommentRequest } from '../../utils';
import { CASE_COMMENTS_URL, ENABLE_CASE_CONNECTOR } from '../../../../../common';
import { CaseServiceSetup } from '../../../../services';

interface CombinedCaseParams {
  service: CaseServiceSetup;
  client: SavedObjectsClientContract;
  caseID: string;
  logger: Logger;
  subCaseId?: string;
}

async function getCommentableCase({
  service,
  client,
  caseID,
  subCaseId,
  logger,
}: CombinedCaseParams) {
  if (subCaseId) {
    const [caseInfo, subCase] = await Promise.all([
      service.getCase({
        client,
        id: caseID,
      }),
      service.getSubCase({
        client,
        id: subCaseId,
      }),
    ]);
    return new CommentableCase({
      collection: caseInfo,
      service,
      subCase,
      soClient: client,
      logger,
    });
  } else {
    const caseInfo = await service.getCase({
      client,
      id: caseID,
    });
    return new CommentableCase({ collection: caseInfo, service, soClient: client, logger });
  }
}

export function initPatchCommentApi({ caseService, router, userActionService, logger }: RouteDeps) {
  router.patch(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            subCaseId: schema.maybe(schema.string()),
          })
        ),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!ENABLE_CASE_CONNECTOR && request.query?.subCaseId !== undefined) {
          throw Boom.badRequest(
            'The `subCaseId` is not supported when the case connector feature is disabled'
          );
        }

        const client = context.core.savedObjects.client;
        const query = pipe(
          CommentPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { id: queryCommentId, version: queryCommentVersion, ...queryRestAttributes } = query;
        decodeCommentRequest(queryRestAttributes);

        const commentableCase = await getCommentableCase({
          service: caseService,
          client,
          caseID: request.params.case_id,
          subCaseId: request.query?.subCaseId,
          logger,
        });

        const myComment = await caseService.getComment({
          client,
          commentId: queryCommentId,
        });

        if (myComment == null) {
          throw Boom.notFound(`This comment ${queryCommentId} does not exist anymore.`);
        }

        if (myComment.attributes.type !== queryRestAttributes.type) {
          throw Boom.badRequest(`You cannot change the type of the comment.`);
        }

        const saveObjType = request.query?.subCaseId ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;

        const caseRef = myComment.references.find((c) => c.type === saveObjType);
        if (caseRef == null || (caseRef != null && caseRef.id !== commentableCase.id)) {
          throw Boom.notFound(
            `This comment ${queryCommentId} does not exist in ${commentableCase.id}).`
          );
        }

        if (queryCommentVersion !== myComment.version) {
          throw Boom.conflict(
            'This case has been updated. Please refresh before saving additional updates.'
          );
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request });
        const userInfo: User = {
          username,
          full_name,
          email,
        };

        const updatedDate = new Date().toISOString();
        const {
          comment: updatedComment,
          commentableCase: updatedCase,
        } = await commentableCase.updateComment({
          updateRequest: query,
          updatedAt: updatedDate,
          user: userInfo,
        });

        await userActionService.postUserActions({
          client,
          actions: [
            buildCommentUserActionItem({
              action: 'update',
              actionAt: updatedDate,
              actionBy: { username, full_name, email },
              caseId: request.params.case_id,
              subCaseId: request.query?.subCaseId,
              commentId: updatedComment.id,
              fields: ['comment'],
              newValue: JSON.stringify(queryRestAttributes),
              oldValue: JSON.stringify(
                // We are interested only in ContextBasicRt attributes
                // myComment.attribute contains also CommentAttributesBasicRt attributes
                pick(Object.keys(queryRestAttributes), myComment.attributes)
              ),
            }),
          ],
        });

        return response.ok({
          body: await updatedCase.encode(),
        });
      } catch (error) {
        logger.error(
          `Failed to patch comment in route case id: ${request.params.case_id} sub case id: ${request.query?.subCaseId}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
