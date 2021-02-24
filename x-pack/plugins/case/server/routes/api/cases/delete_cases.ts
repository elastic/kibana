/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SavedObjectsClientContract } from 'src/core/server';
import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';

async function deleteSubCases({
  caseService,
  client,
  caseIds,
}: {
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
  caseIds: string[];
}) {
  const subCasesForCaseIds = await caseService.findSubCasesByCaseId({ client, ids: caseIds });

  const subCaseIDs = subCasesForCaseIds.saved_objects.map((subCase) => subCase.id);
  const commentsForSubCases = await caseService.getAllSubCaseComments({
    client,
    id: subCaseIDs,
  });

  // This shouldn't actually delete anything because all the comments should be deleted when comments are deleted
  // per case ID
  await Promise.all(
    commentsForSubCases.saved_objects.map((commentSO) =>
      caseService.deleteComment({ client, commentId: commentSO.id })
    )
  );

  await Promise.all(
    subCasesForCaseIds.saved_objects.map((subCaseSO) =>
      caseService.deleteSubCase(client, subCaseSO.id)
    )
  );
}

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
              id,
            })
          )
        );
        const comments = await Promise.all(
          request.query.ids.map((id) =>
            caseService.getAllCaseComments({
              client,
              id,
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

        await deleteSubCases({ caseService, client, caseIds: request.query.ids });
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request });
        const deleteDate = new Date().toISOString();

        await userActionService.postUserActions({
          client,
          actions: request.query.ids.map((id) =>
            buildCaseUserActionItem({
              action: 'create',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              caseId: id,
              fields: ['comment', 'description', 'status', 'tags', 'title', 'sub_case'],
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
