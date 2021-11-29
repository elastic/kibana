/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../../../../../../../private/var/tmp/_bazel_sqren/0095b6903ba3e5f57f5da9fcb4ada8db/execroot/kibana/bazel-out/darwin-fastbuild/bin/x-pack/plugins/apm/common/elasticsearch_fieldnames';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../common/index_pattern_constants';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';
import { Setup } from '../../lib/helpers/setup_request';
import { APMRouteHandlerResources } from '../../routes/typings';
import { InternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client.js';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmDataViewTitle } from './get_apm_data_view_title';

interface ApmDataViewAttributes {
  title: string;
}

export async function createStaticDataView({
  setup,
  config,
  savedObjectsClient,
  spaceId,
}: {
  setup: Setup;
  config: APMRouteHandlerResources['config'];
  savedObjectsClient: InternalSavedObjectsClient;
  spaceId?: string;
}): Promise<boolean> {
  return withApmSpan('create_static_data_view', async () => {
    // don't autocreate APM data view if it's been disabled via the config
    if (!config.autocreateApmIndexPattern) {
      return false;
    }

    // Discover and other apps will throw errors if an data view exists without having matching indices.
    // The following ensures the data view is only created if APM data is found
    const hasData = await hasHistoricalAgentData(setup);
    if (!hasData) {
      return false;
    }

    const apmDataViewTitle = getApmDataViewTitle(setup.indices);
    const forceOverwrite = await getForceOverwrite({
      apmDataViewTitle,
      savedObjectsClient,
    });

    try {
      await withApmSpan('create_index_pattern_saved_object', () =>
        savedObjectsClient.create(
          'index-pattern',
          {
            title: apmDataViewTitle,

            // link to APM from Discover
            fieldFormatMap: JSON.stringify({
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
            }),
          },
          {
            id: APM_STATIC_INDEX_PATTERN_ID,
            overwrite: forceOverwrite,
            namespace: spaceId,
          }
        )
      );
      return true;
    } catch (e) {
      // if the data view (saved object) already exists a conflict error (code: 409) will be thrown
      // that error should be silenced
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        return false;
      }
      throw e;
    }
  });
}

// force an overwrite of the data view if the data view has been changed
async function getForceOverwrite({
  savedObjectsClient,
  apmDataViewTitle,
}: {
  savedObjectsClient: InternalSavedObjectsClient;
  apmDataViewTitle: string;
}) {
  try {
    const existingDataView =
      await savedObjectsClient.get<ApmDataViewAttributes>(
        'index-pattern',
        APM_STATIC_INDEX_PATTERN_ID
      );

    // if the existing data view does not matches the new one, force an update
    return existingDataView.attributes.title !== apmDataViewTitle;
  } catch (e) {
    // ignore exception if the data view (saved object) is not found
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return false;
    }

    throw e;
  }
}
