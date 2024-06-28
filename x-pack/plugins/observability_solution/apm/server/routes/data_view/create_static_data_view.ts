/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { getStaticDataViewId } from '@kbn/apm-data-view';
import { TRACE_ID, TRANSACTION_ID, TRANSACTION_DURATION } from '../../../common/es_fields/apm';
import { hasHistoricalAgentData } from '../historical_data/has_historical_agent_data';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmDataViewIndexPattern } from './get_apm_data_view_index_pattern';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';

export type CreateDataViewResponse = Promise<
  { created: boolean; dataView: DataView } | { created: boolean; reason?: string }
>;

export async function createOrUpdateStaticDataView({
  dataViewService,
  resources,
  apmEventClient,
  spaceId,
  logger,
}: {
  dataViewService: DataViewsService;
  resources: APMRouteHandlerResources;
  apmEventClient: APMEventClient;
  spaceId: string;
  logger: Logger;
}): CreateDataViewResponse {
  const { config } = resources;
  const dataViewId = getStaticDataViewId(spaceId);
  logger.info(`create static data view ${dataViewId}`);

  return withApmSpan('create_static_data_view', async () => {
    // don't auto-create APM data view if it's been disabled via the config
    if (!config.autoCreateApmDataView) {
      return {
        created: false,
        reason: i18n.translate('xpack.apm.dataView.autoCreateDisabled', {
          defaultMessage:
            'Auto-creation of data views has been disabled via "autoCreateApmDataView" config option',
        }),
      };
    }

    // Discover and other apps will throw errors if an data view exists without having matching indices.
    // The following ensures the data view is only created if APM data is found
    const hasData = await hasHistoricalAgentData(apmEventClient);

    if (!hasData) {
      return {
        created: false,
        reason: i18n.translate('xpack.apm.dataView.noApmData', {
          defaultMessage: 'No APM data',
        }),
      };
    }

    const apmDataViewIndexPattern = getApmDataViewIndexPattern(apmEventClient.indices);
    const shouldCreateOrUpdate = await getShouldCreateOrUpdate({
      apmDataViewIndexPattern,
      dataViewService,
      dataViewId,
    });

    if (!shouldCreateOrUpdate) {
      return {
        created: false,
        reason: i18n.translate('xpack.apm.dataView.alreadyExistsInActiveSpace', {
          defaultMessage:
            'Dataview already exists in the active space and does not need to be updated',
        }),
      };
    }

    // delete legacy global data view

    const dataView = await createAndSaveStaticDataView({
      dataViewService,
      apmDataViewIndexPattern,
      dataViewId,
    });

    return { created: true, dataView };
  });
}

// only create data view if it doesn't exist or was changed
async function getShouldCreateOrUpdate({
  dataViewService,
  apmDataViewIndexPattern,
  dataViewId,
}: {
  dataViewService: DataViewsService;
  apmDataViewIndexPattern: string;
  dataViewId: string;
}) {
  try {
    const existingDataView = await dataViewService.get(dataViewId);
    return existingDataView.getIndexPattern() !== apmDataViewIndexPattern;
  } catch (e) {
    // ignore exception if the data view (saved object) is not found
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return true;
    }

    throw e;
  }
}

function createAndSaveStaticDataView({
  dataViewService,
  apmDataViewIndexPattern,
  dataViewId,
}: {
  dataViewService: DataViewsService;
  apmDataViewIndexPattern: string;
  dataViewId: string;
}) {
  return dataViewService.createAndSave(
    {
      allowNoIndex: true,
      id: dataViewId,
      name: 'APM',
      title: apmDataViewIndexPattern,
      timeFieldName: '@timestamp',

      // link to APM from Discover
      fieldFormats: {
        [TRACE_ID]: {
          id: 'url',
          params: {
            urlTemplate: 'apm/link-to/trace/{{value}}',
            labelTemplate: '{{value}}',
          },
        },
        [TRANSACTION_ID]: {
          id: 'url',
          params: {
            urlTemplate: 'apm/link-to/transaction/{{value}}',
            labelTemplate: '{{value}}',
          },
        },
        [TRANSACTION_DURATION]: {
          id: 'duration',
          params: {
            inputFormat: 'microseconds',
            outputFormat: 'asMilliseconds',
            showSuffix: true,
            useShortSuffix: true,
            outputPrecision: 2,
            includeSpaceWithSuffix: true,
          },
        },
      },
    },
    true
  );
}
