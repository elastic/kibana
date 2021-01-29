/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { ActionType } from '../../../../../../actions/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FindActionResult } from '../../../../../../actions/server/types';

import {
  CASE_CONFIGURE_CONNECTORS_URL,
  SERVICENOW_ACTION_TYPE_ID,
  JIRA_ACTION_TYPE_ID,
  RESILIENT_ACTION_TYPE_ID,
} from '../../../../../common/constants';

const isConnectorSupported = (
  action: FindActionResult,
  actionTypes: Record<string, ActionType>
): boolean =>
  [SERVICENOW_ACTION_TYPE_ID, JIRA_ACTION_TYPE_ID, RESILIENT_ACTION_TYPE_ID].includes(
    action.actionTypeId
  ) && actionTypes[action.actionTypeId]?.enabledInLicense;

/*
 * Be aware that this api will only return 20 connectors
 */

export function initCaseConfigureGetActionConnector({ router }: RouteDeps) {
  router.get(
    {
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const actionsClient = await context.actions?.getActionsClient();

        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }

        const actionTypes = (await actionsClient.listTypes()).reduce(
          (types, type) => ({ ...types, [type.id]: type }),
          {}
        );

        const results = (await actionsClient.getAll()).filter((action) =>
          isConnectorSupported(action, actionTypes)
        );
        return response.ok({ body: results });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
