/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_DURATION,
} from '../../../common/es_fields/apm';
import { APM_STATIC_DATA_VIEW_ID } from '../../../common/data_view_constants';
import { hasHistoricalAgentData } from '../historical_data/has_historical_agent_data';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmDataViewTitle } from './get_apm_data_view_title';

import { APMRouteHandlerResources } from '../typings';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export type CreateDataViewResponse = Promise<
  | { created: boolean; dataView: DataView }
  | { created: boolean; reason?: string }
>;

export async function createStaticDataView({
  dataViewService,
  resources,
  apmEventClient,
}: {
  dataViewService: DataViewsService;
  resources: APMRouteHandlerResources;
  apmEventClient: APMEventClient;
}): CreateDataViewResponse {
  const { config } = resources;

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

    const apmDataViewTitle = getApmDataViewTitle(apmEventClient.indices);
    const shouldCreateOrUpdate = await getShouldCreateOrUpdate({
      apmDataViewTitle,
      dataViewService,
    });

    if (!shouldCreateOrUpdate) {
      return {
        created: false,
        reason: i18n.translate(
          'xpack.apm.dataView.alreadyExistsInActiveSpace',
          { defaultMessage: 'Dataview already exists in the active space' }
        ),
      };
    }

    return await withApmSpan('create_data_view', async () => {
      try {
        const dataView = await createAndSaveStaticDataView({
          dataViewService,
          apmDataViewTitle,
        });

        await addDataViewToAllSpaces(resources);

        return { created: true, dataView };
      } catch (e) {
        // if the data view (saved object) already exists a conflict error (code: 409) will be thrown
        if (SavedObjectsErrorHelpers.isConflictError(e)) {
          return {
            created: false,
            reason: i18n.translate(
              'xpack.apm.dataView.alreadyExistsInAnotherSpace',
              {
                defaultMessage:
                  'Dataview already exists in another space but is not made available in this space',
              }
            ),
          };
        }
        throw e;
      }
    });
  });
}

// only create data view if it doesn't exist or was changed
async function getShouldCreateOrUpdate({
  dataViewService,
  apmDataViewTitle,
}: {
  dataViewService: DataViewsService;
  apmDataViewTitle: string;
}) {
  try {
    const existingDataView = await dataViewService.get(APM_STATIC_DATA_VIEW_ID);
    return existingDataView.title !== apmDataViewTitle;
  } catch (e) {
    // ignore exception if the data view (saved object) is not found
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return true;
    }

    throw e;
  }
}

async function addDataViewToAllSpaces(resources: APMRouteHandlerResources) {
  const { request, core } = resources;
  const startServices = await core.start();
  const scopedClient = startServices.savedObjects.getScopedClient(request);

  // make data view available across all spaces
  return scopedClient.updateObjectsSpaces(
    [{ id: APM_STATIC_DATA_VIEW_ID, type: 'index-pattern' }],
    ['*'],
    []
  );
}

function createAndSaveStaticDataView({
  dataViewService,
  apmDataViewTitle,
}: {
  dataViewService: DataViewsService;
  apmDataViewTitle: string;
}) {
  return dataViewService.createAndSave(
    {
      allowNoIndex: true,
      id: APM_STATIC_DATA_VIEW_ID,
      name: 'APM',
      title: apmDataViewTitle,
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
