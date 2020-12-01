/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FindActionResult } from '../../../../../../actions/server/types';

import {
  CASE_CONFIGURE_CONNECTORS_URL,
  SERVICENOW_ACTION_TYPE_ID,
  JIRA_ACTION_TYPE_ID,
  RESILIENT_ACTION_TYPE_ID,
} from '../../../../../common/constants';

/**
 * We need to take into account connectors that have been created within cases and
 * they do not have the isCaseOwned field. Checking for the existence of
 * the mapping attribute ensures that the connector is indeed a case connector.
 * Cases connector should always have a mapping.
 */

interface CaseAction extends FindActionResult {
  config?: {
    isCaseOwned?: boolean;
    incidentConfiguration?: Record<string, unknown>;
  };
}

const isCaseOwned = (action: CaseAction): boolean => {
  if (
    [SERVICENOW_ACTION_TYPE_ID, JIRA_ACTION_TYPE_ID, RESILIENT_ACTION_TYPE_ID].includes(
      action.actionTypeId
    )
  ) {
    if (action.config?.isCaseOwned === true || action.config?.incidentConfiguration?.mapping) {
      return true;
    }
  }

  return false;
};

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

        const results = (await actionsClient.getAll()).filter(isCaseOwned);
        return response.ok({ body: results });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
