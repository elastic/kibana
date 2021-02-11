/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { AssociationType } from '../../../../../common/api';

export function initDeleteAllCommentsApi({ caseService, router, userActionService }: RouteDeps) {
  router.delete(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            subCaseID: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request });
        const deleteDate = new Date().toISOString();

        const id = request.query?.subCaseID ?? request.params.case_id;
        const comments = await caseService.getCommentsByAssociation({
          client,
          id,
          associationType: request.query?.subCaseID
            ? AssociationType.subCase
            : AssociationType.case,
        });

        await Promise.all(
          comments.saved_objects.map((comment) =>
            caseService.deleteComment({
              client,
              commentId: comment.id,
            })
          )
        );

        await userActionService.postUserActions({
          client,
          actions: comments.saved_objects.map((comment) =>
            buildCommentUserActionItem({
              action: 'delete',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              caseId: request.params.case_id,
              subCaseId: request.query?.subCaseID,
              commentId: comment.id,
              fields: ['comment'],
            })
          ),
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
