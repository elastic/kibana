/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { defaultLogViewId } from '../../../common/log_views';
import { MIGRATE_LOG_VIEW_SETTINGS_URL } from '../../../common/http_api/deprecations';
import { logSourcesKibanaAdvancedSettingRT } from '../../../common';
import { LogsSharedBackendLibs } from '../../lib/logs_shared_types';

// This route facilitates automated one-click handling of updating log view's to use the
// Kibana advanced setting as part of the upgrade assistant.
// First, it will gather the indices currently set on the log view.
// Secondly, it will update the advanced setting to use these indices.
// Lastly, it will update the log view to use the kibana advanced setting.
export const initMigrateLogViewSettingsRoute = ({
  framework,
  getStartServices,
}: LogsSharedBackendLibs) => {
  framework.router.put(
    { path: MIGRATE_LOG_VIEW_SETTINGS_URL, validate: false },
    async (context, request, response) => {
      try {
        const { elasticsearch, savedObjects } = await context.core;
        const allAvailableSpaces = await savedObjects.client.getSearchableNamespaces(['*']);

        const [_, pluginStartDeps, pluginStart] = await getStartServices();

        const updated = await pMap(
          allAvailableSpaces,
          async (spaceId) => {
            const spaceScopedSavedObjectsClient = savedObjects.client.asScopedToNamespace(spaceId);

            const logSourcesServicePromise =
              pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
                spaceScopedSavedObjectsClient
              );
            const logViewsClient = pluginStart.logViews.getClient(
              spaceScopedSavedObjectsClient,
              elasticsearch.client.asCurrentUser,
              logSourcesServicePromise
            );

            const logView = await logViewsClient.getLogView(defaultLogViewId);

            if (!logView || logSourcesKibanaAdvancedSettingRT.is(logView.attributes.logIndices)) {
              return false;
            }

            const indices = (
              await logViewsClient.getResolvedLogView({
                type: 'log-view-reference',
                logViewId: defaultLogViewId,
              })
            ).indices;

            const logSourcesService = await logSourcesServicePromise;
            await logSourcesService.setLogSources([{ indexPattern: indices }]);
            await logViewsClient.putLogView(defaultLogViewId, {
              logIndices: { type: 'kibana_advanced_setting' },
            });

            return true;
          },
          { concurrency: 20 }
        );

        if (!updated.includes(true)) {
          return response.customError({
            body: new Error(
              "Unable to migrate log view settings. A log view either doesn't exist or is already using the Kibana advanced setting."
            ),
            statusCode: 400,
          });
        }

        return response.ok();
      } catch (error) {
        throw error;
      }
    }
  );
};
