/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { AlertsFactory } from '../../../../alerts';
import { LegacyServer, RouteDependencies } from '../../../../types';
import { ALERT_ACTION_TYPE_LOG } from '../../../../../common/constants';
import { ActionResult } from '../../../../../../actions/common';
import { AlertingSecurity } from '../../../../lib/elasticsearch/verify_alerting_security';
import { disableWatcherClusterAlerts } from '../../../../lib/alerts/disable_watcher_cluster_alerts';
import { AlertTypeParams, SanitizedAlert } from '../../../../../../alerting/common';

const DEFAULT_SERVER_LOG_NAME = 'Monitoring: Write to Kibana log';

export function enableAlertsRoute(server: LegacyServer, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alerts/enable',
      validate: false,
    },
    async (context, request, response) => {
      try {
        // Check to ensure the space is listed in monitoring.cluster_alerts.allowedSpaces
        const config = server.config();
        const allowedSpaces =
          config.get('monitoring.cluster_alerts.allowedSpaces') || ([] as string[]);
        if (!allowedSpaces.includes(context.infra.spaceId)) {
          server.log.info(
            `Skipping alert creation for "${context.infra.spaceId}" space; add space ID to 'monitoring.cluster_alerts.allowedSpaces' in your kibana.yml`
          );
          return response.ok({ body: undefined });
        }

        const alerts = AlertsFactory.getAll();
        if (alerts.length) {
          const {
            isSufficientlySecure,
            hasPermanentEncryptionKey,
          } = await AlertingSecurity.getSecurityHealth(context, npRoute.encryptedSavedObjects);

          if (!isSufficientlySecure || !hasPermanentEncryptionKey) {
            server.log.info(
              `Skipping alert creation for "${context.infra.spaceId}" space; Stack monitoring alerts require Transport Layer Security between Kibana and Elasticsearch, and an encryption key in your kibana.yml file.`
            );
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

        let createdAlerts: Array<SanitizedAlert<AlertTypeParams>> = [];
        const disabledWatcherClusterAlerts = await disableWatcherClusterAlerts(
          npRoute.cluster.asScoped(request).asCurrentUser,
          npRoute.logger
        );

        if (disabledWatcherClusterAlerts) {
          createdAlerts = await Promise.all(
            alerts.map((alert) => alert.createIfDoesNotExist(alertsClient, actionsClient, actions))
          );
        }

        server.log.info(
          `Created ${createdAlerts.length} alerts for "${context.infra.spaceId}" space`
        );

        return response.ok({ body: { createdAlerts, disabledWatcherClusterAlerts } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
