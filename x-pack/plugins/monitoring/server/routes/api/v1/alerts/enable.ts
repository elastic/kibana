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
import { AlertingSecurity } from '../../../../lib/elasticsearch/verify_alerting_security';
import { disableWatcherClusterAlerts } from '../../../../lib/alerts/disable_watcher_cluster_alerts';
import { Alert, AlertTypeParams } from '../../../../../../alerts/common';

const DEFAULT_SERVER_LOG_NAME = 'Monitoring: Write to Kibana log';

export function enableAlertsRoute(_server: unknown, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alerts/enable',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const alerts = AlertsFactory.getAll().filter((a) => a.isEnabled(npRoute.licenseService));

        if (alerts.length) {
          const {
            isSufficientlySecure,
            hasPermanentEncryptionKey,
          } = await AlertingSecurity.getSecurityHealth(context, npRoute.encryptedSavedObjects);

          if (!isSufficientlySecure || !hasPermanentEncryptionKey) {
            return response.ok({
              body: {
                isSufficientlySecure,
                hasPermanentEncryptionKey,
              },
            });
          }
        }

        const alertsClient = context.alerting?.getAlertsClient();
        const actionsClient = context.actions?.getActionsClient();
        const types = context.actions?.listTypes();
        if (!alertsClient || !actionsClient || !types) {
          return response.ok({ body: undefined });
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

        let createdAlerts: Array<Alert<AlertTypeParams>> = [];
        const disabledWatcherClusterAlerts = await disableWatcherClusterAlerts(
          npRoute.cluster.asScoped(request).callAsCurrentUser,
          npRoute.logger
        );

        if (disabledWatcherClusterAlerts) {
          createdAlerts = await Promise.all(
            alerts.map((alert) => alert.createIfDoesNotExist(alertsClient, actionsClient, actions))
          );
        }

        return response.ok({ body: { createdAlerts, disabledWatcherClusterAlerts } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
