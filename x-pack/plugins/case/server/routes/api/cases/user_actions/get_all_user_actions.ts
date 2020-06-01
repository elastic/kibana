/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { CaseUserActionsResponseRt } from '../../../../../common/api';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../../saved_object_types';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_USER_ACTIONS_URL } from '../../../../../common/constants';

export function initGetAllUserActionsApi({ userActionService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_USER_ACTIONS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const userActions = await userActionService.getUserActions({
          client,
          caseId: request.params.case_id,
        });
        return response.ok({
          body: CaseUserActionsResponseRt.encode(
            userActions.saved_objects.map((ua) => ({
              ...ua.attributes,
              action_id: ua.id,
              case_id: ua.references.find((r) => r.type === CASE_SAVED_OBJECT)?.id ?? '',
              comment_id:
                ua.references.find((r) => r.type === CASE_COMMENT_SAVED_OBJECT)?.id ?? null,
            }))
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
