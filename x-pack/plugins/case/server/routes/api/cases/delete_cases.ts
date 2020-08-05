/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASES_URL } from '../../../../common/constants';

export function initDeleteCasesApi({ caseService, router, userActionService }: RouteDeps) {
  router.delete(
    {
      path: CASES_URL,
      validate: {
        query: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        await Promise.all(
          request.query.ids.map((id) =>
            caseService.deleteCase({
              client,
              caseId: id,
            })
          )
        );
        const comments = await Promise.all(
          request.query.ids.map((id) =>
            caseService.getAllCaseComments({
              client,
              caseId: id,
            })
          )
        );

        if (comments.some((c) => c.saved_objects.length > 0)) {
          await Promise.all(
            comments.map((c) =>
              Promise.all(
                c.saved_objects.map(({ id }) =>
                  caseService.deleteComment({
                    client,
                    commentId: id,
                  })
                )
              )
            )
          );
        }
        const { username, full_name, email } = await caseService.getUser({ request, response });
        const deleteDate = new Date().toISOString();

        await userActionService.postUserActions({
          client,
          actions: request.query.ids.map((id) =>
            buildCaseUserActionItem({
              action: 'create',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              caseId: id,
              fields: ['comment', 'description', 'status', 'tags', 'title'],
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
