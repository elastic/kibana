/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceNowConnectorConfiguration } from '../../../../../../triggers_actions_ui/public/common/constants';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import {
  CASE_CONFIGURE_CONNECTORS_URL,
  SUPPORTED_CONNECTORS,
} from '../../../../../common/constants';

/*
 * Be aware that this api will only return 20 connectors
 */

export function initCaseConfigureGetActionConnector({ caseService, router }: RouteDeps) {
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

        const results = (await actionsClient.getAll()).filter(
          (action) =>
            SUPPORTED_CONNECTORS.includes(action.actionTypeId) &&
            // Need this filtering temporary to display only Case owned ServiceNow connectors
            (action.actionTypeId !== ServiceNowConnectorConfiguration.id ||
              (action.actionTypeId === ServiceNowConnectorConfiguration.id &&
                action.config!.isCaseOwned))
        );
        return response.ok({ body: results });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
