/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      const [_, pluginStartDeps, pluginStart] = await getStartServices();

      const logSourcesService =
        await pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getScopedLogSourcesService(
          request
        );
      const logViewsClient = pluginStart.logViews.getScopedClient(request);

      const logView = await logViewsClient.getLogView('default');

      if (!logView || logSourcesKibanaAdvancedSettingRT.is(logView.attributes.logIndices)) {
        throw new Error(
          "Unable to migrate log view settings. A log view either doesn't exist or is already using the Kibana advanced setting."
        );
      }

      const indices = (
        await logViewsClient.getResolvedLogView({
          type: 'log-view-reference',
          logViewId: 'default',
        })
      ).indices;

      await logSourcesService.setLogSources([{ indexPattern: indices }]);
      await logViewsClient.putLogView('default', {
        logIndices: { type: 'kibana_advanced_setting' },
      });
      return response.ok();
    }
  );
};
