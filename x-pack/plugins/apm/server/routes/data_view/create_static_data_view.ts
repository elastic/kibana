/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { APM_STATIC_DATA_VIEW_ID } from '../../../common/data_view_constants';
import { hasHistoricalAgentData } from '../historical_data/has_historical_agent_data';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmDataViewTitle } from './get_apm_data_view_title';
import { Setup } from '../../lib/helpers/setup_request';
import { APMConfig } from '../..';

export async function createStaticDataView({
  dataViewService,
  config,
  setup,
}: {
  dataViewService: DataViewsService;
  config: APMConfig;
  setup: Setup;
}): Promise<DataView | undefined> {
  return withApmSpan('create_static_data_view', async () => {
    // don't auto-create APM data view if it's been disabled via the config
    if (!config.autoCreateApmDataView) {
      return;
    }

    // Discover and other apps will throw errors if an data view exists without having matching indices.
    // The following ensures the data view is only created if APM data is found
    const hasData = await hasHistoricalAgentData(setup);
    if (!hasData) {
      return;
    }

    const apmDataViewTitle = getApmDataViewTitle(setup.indices);
    const shouldCreateOrUpdate = await getShouldCreateOrUpdate({
      apmDataViewTitle,
      dataViewService,
    });

    if (!shouldCreateOrUpdate) {
      return;
    }

    try {
      return await withApmSpan('create_data_view', async () => {
        const dataView = await dataViewService.createAndSave(
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
            },
          },
          true
        );

        return dataView;
      });
    } catch (e) {
      // if the data view (saved object) already exists a conflict error (code: 409) will be thrown
      // that error should be silenced
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        return;
      }
      throw e;
    }
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
