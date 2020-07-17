/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { AlertsFactory } from '../../../../alerts';
import { RouteDependencies } from '../../../../types';
import { ALERT_ACTION_TYPE_LOG } from '../../../../../common/constants';
import { ActionResult } from '../../../../../../actions/common';
// import { fetchDefaultEmailAddress } from '../../../../lib/alerts/fetch_default_email_address';

const DEFAULT_SERVER_LOG_NAME = 'Monitoring: Write to Kibana log';

export function enableAlertsRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alerts/enable',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const actionsClient = context.actions?.getActionsClient();
        const types = context.actions?.listTypes();
        if (!alertsClient || !actionsClient || !types) {
          return response.notFound();
        }

        // Get or create the default log action
        let serverLogAction;
        const allActions = await actionsClient.getAll();
        for (const action of allActions) {
          if (action.name === DEFAULT_SERVER_LOG_NAME) {
            serverLogAction = action as ActionResult;
            break;
          }
        }

        if (!serverLogAction) {
          serverLogAction = await actionsClient.create({
            action: {
              name: DEFAULT_SERVER_LOG_NAME,
              actionTypeId: ALERT_ACTION_TYPE_LOG,
              config: {},
              secrets: {},
            },
          });
        }

        const actions = [
          {
            id: serverLogAction.id,
            config: {},
          },
        ];

        const alerts = AlertsFactory.getAll().filter((a) => a.isEnabled(npRoute.licenseService));
        const createdAlerts = await Promise.all(
          alerts.map(
            async (alert) => await alert.createIfDoesNotExist(alertsClient, actionsClient, actions)
          )
        );
        return response.ok({ body: createdAlerts });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
