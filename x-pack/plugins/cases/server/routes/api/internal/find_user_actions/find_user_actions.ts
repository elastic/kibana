/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { attachmentApiV1, userActionApiV1 } from '../../../../../common/types/api';
import { INTERNAL_CASE_FIND_USER_ACTIONS_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const findUserActionsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_FIND_USER_ACTIONS_URL,
  params,
  routerOptions: {
    access: 'public',
    summary: 'Get user actions by case',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;

      const options = request.query as userActionApiV1.UserActionFindRequest;
      const userActionsResponse: userActionApiV1.UserActionFindResponse =
        await casesClient.userActions.find({
          caseId,
          params: options,
        });

      const commentIds = userActionsResponse.userActions
        .map((userAction) => userAction.comment_id)
        .filter(Boolean) as string[];

      let comments: attachmentApiV1.BulkGetAttachmentsResponse;
      if (commentIds.length > 0) {
        comments = await casesClient.attachments.bulkGet({
          caseID: caseId,
          attachmentIDs: commentIds,
        });
      }

      const userActionWithUpdatedComments = userActionsResponse.userActions.map((userAction) => {
        const comment = comments.attachments.find((c) => c.id === userAction.comment_id);

        if (userAction.type === 'comment' && comment?.comment) {
          return {
            ...userAction,
            payload: {
              ...userAction.payload,
              latest: { updated_at: comment.updated_at, comment: comment.comment },
            },
          };
        }

        return userAction;
      });

      return response.ok({
        body: {
          ...userActionsResponse,
          userActions: userActionWithUpdatedComments,
        },
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case details in route case id: ${request.params.case_id}: \n${error}`,
        error,
      });
    }
  },
});
