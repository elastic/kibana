/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { i18n } from '@kbn/i18n';
import pMap from 'p-map';
import { defaultLogViewId } from '../../common/log_views';
import { MIGRATE_LOG_VIEW_SETTINGS_URL } from '../../common/http_api/deprecations';
import { logSourcesKibanaAdvancedSettingRT } from '../../common';
import { LogsSharedPluginStartServicesAccessor } from '../types';

export interface LogSourcesSettingDeprecationParams {
  context: GetDeprecationsContext;
  getStartServices: LogsSharedPluginStartServicesAccessor;
}

export const getLogSourcesSettingDeprecationInfo = async (
  params: LogSourcesSettingDeprecationParams
): Promise<DeprecationsDetails[]> => {
  const allAvailableSpaces = await params.context.savedObjectsClient.getSearchableNamespaces(['*']);

  const deprecationPerSpaceFactory = getLogSourcesSettingDeprecationInfoForSpaceFactory(params);

  const deprecations = await pMap(allAvailableSpaces, deprecationPerSpaceFactory, {
    concurrency: 20, // limit the number of spaces handled concurrently to make sure that we cover large deployments
  });

  // unnest results
  return ([] as DeprecationsDetails[]).concat(...deprecations);
};

export const getLogSourcesSettingDeprecationInfoForSpaceFactory = ({
  getStartServices,
  context,
}: LogSourcesSettingDeprecationParams): ((spaceId: string) => Promise<DeprecationsDetails[]>) => {
  return async (spaceId) => {
    const [_, pluginStartDeps, pluginStart] = await getStartServices();

    // Get a new Saved Object Client scoped to the spaceId
    const spaceScopedSavedObjectsClient = context.savedObjectsClient.asScopedToNamespace(spaceId);

    const logSourcesService =
      pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
        spaceScopedSavedObjectsClient
      );
    const logViewsClient = pluginStart.logViews.getClient(
      spaceScopedSavedObjectsClient,
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
              defaultMessage: 'Log sources setting in space "{spaceId}"',
              values: { spaceId },
            }
          ),
          level: 'warning',
          deprecationType: 'feature',
          message: i18n.translate(
            'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message',
            {
              defaultMessage:
                'Indices and Data view options previously provided via the Logs UI settings page are now deprecated. Please migrate to using the Kibana log sources advanced setting in space "{spaceId}".',
              values: { spaceId },
            }
          ),
          correctiveActions: {
            manualSteps: [
              i18n.translate(
                'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message.manualStepMessage',
                {
                  defaultMessage:
                    'In space "{spaceId}" update the Log sources Kibana advanced setting (via Management > Advanced Settings) to match the setting previously provided via the Logs UI settings page. Then via the Logs UI settings page use the Kibana log sources advanced setting option.',
                  values: { spaceId },
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
};
