/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { getComments } from '../helpers';
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
            sub_case_id: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request, response });
        const deleteDate = new Date().toISOString();

        const id = request.query?.sub_case_id ?? request.params.case_id;
        const comments = await getComments({
          client,
          caseService,
          id,
          associationType: request.query?.sub_case_id
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
              caseId: id,
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
