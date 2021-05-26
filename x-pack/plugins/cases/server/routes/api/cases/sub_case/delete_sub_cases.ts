/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { buildCaseUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { SUB_CASES_PATCH_DEL_URL } from '../../../../../common';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';

export function initDeleteSubCasesApi({
  caseService,
  router,
  userActionService,
  logger,
}: RouteDeps) {
  router.delete(
    {
      path: SUB_CASES_PATCH_DEL_URL,
      validate: {
        query: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const [comments, subCases] = await Promise.all([
          caseService.getAllSubCaseComments({ client, id: request.query.ids }),
          caseService.getSubCases({ client, ids: request.query.ids }),
        ]);

        const subCaseErrors = subCases.saved_objects.filter(
          (subCase) => subCase.error !== undefined
        );

        if (subCaseErrors.length > 0) {
          throw Boom.notFound(
            `These sub cases ${subCaseErrors
              .map((c) => c.id)
              .join(', ')} do not exist. Please check you have the correct ids.`
          );
        }

        const subCaseIDToParentID = subCases.saved_objects.reduce((acc, subCase) => {
          const parentID = subCase.references.find((ref) => ref.type === CASE_SAVED_OBJECT);
          acc.set(subCase.id, parentID?.id);
          return acc;
        }, new Map<string, string | undefined>());

        await Promise.all(
          comments.saved_objects.map((comment) =>
            caseService.deleteComment({ client, commentId: comment.id })
          )
        );

        await Promise.all(request.query.ids.map((id) => caseService.deleteSubCase(client, id)));

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request });
        const deleteDate = new Date().toISOString();

        await userActionService.postUserActions({
          client,
          actions: request.query.ids.map((id) =>
            buildCaseUserActionItem({
              action: 'delete',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              // if for some reason the sub case didn't have a reference to its parent, we'll still log a user action
              // but we won't have the case ID
              caseId: subCaseIDToParentID.get(id) ?? '',
              subCaseId: id,
              fields: ['sub_case', 'comment', 'status'],
            })
          ),
        });

        return response.noContent();
      } catch (error) {
        logger.error(
          `Failed to delete sub cases in route ids: ${JSON.stringify(request.query.ids)}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
