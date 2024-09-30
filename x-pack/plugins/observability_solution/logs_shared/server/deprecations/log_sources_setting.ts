/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { i18n } from '@kbn/i18n';
import { defaultLogViewId } from '../../common/log_views';
import { MIGRATE_LOG_VIEW_SETTINGS_URL } from '../../common/http_api/deprecations';
import { logSourcesKibanaAdvancedSettingRT } from '../../common';
import { LogsSharedPluginStartServicesAccessor } from '../types';

export const getLogSourcesSettingDeprecationInfo = async ({
  getStartServices,
  context,
}: {
  context: GetDeprecationsContext;
  getStartServices: LogsSharedPluginStartServicesAccessor;
}): Promise<DeprecationsDetails[]> => {
  const [_, pluginStartDeps, pluginStart] = await getStartServices();
  const logSourcesService =
    pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
      context.savedObjectsClient
    );
  const logViewsClient = pluginStart.logViews.getClient(
    context.savedObjectsClient,
    context.esClient.asCurrentUser,
    logSourcesService
  );

  const logView = await logViewsClient.getLogView(defaultLogViewId);

  if (logView && !logSourcesKibanaAdvancedSettingRT.is(logView.attributes.logIndices)) {
    return [
      {
        title: i18n.translate(
          'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.title',
          {
            defaultMessage: 'Log sources setting',
          }
        ),
        level: 'warning',
        deprecationType: 'feature',
        message: i18n.translate(
          'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message',
          {
            defaultMessage:
              'Indices and Data view options previously provided via the Logs UI settings page are now deprecated. Please migrate to using the Kibana log sources advanced setting.',
          }
        ),
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message.manualStepMessage',
              {
                defaultMessage:
                  'Update the Log sources Kibana advanced setting (via Management > Advanced Settings) to match the setting previously provided via the Logs UI settings page. Then via the Logs UI settings page use the Kibana log sources advanced setting option.',
              }
            ),
          ],
          api: {
            method: 'PUT',
            path: MIGRATE_LOG_VIEW_SETTINGS_URL,
          },
        },
      },
    ];
  } else {
    return [];
  }
};
