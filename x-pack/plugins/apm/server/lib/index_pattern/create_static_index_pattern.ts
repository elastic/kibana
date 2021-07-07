/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../common/index_pattern_constants';
import apmIndexPattern from '../../tutorial/index_pattern.json';
import { hasHistoricalAgentData } from '../services/get_services/has_historical_agent_data';
import { Setup } from '../helpers/setup_request';
import { APMRouteHandlerResources } from '../../routes/typings';
import { InternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client.js';
import { withApmSpan } from '../../utils/with_apm_span';
import { getApmIndexPatternTitle } from './get_apm_index_pattern_title';

export async function createStaticIndexPattern(
  setup: Setup,
  config: APMRouteHandlerResources['config'],
  savedObjectsClient: InternalSavedObjectsClient,
  spaceId: string | undefined
): Promise<boolean> {
  return withApmSpan('create_static_index_pattern', async () => {
    // don't autocreate APM index pattern if it's been disabled via the config
    if (!config['xpack.apm.autocreateApmIndexPattern']) {
      return false;
    }

    // Discover and other apps will throw errors if an index pattern exists without having matching indices.
    // The following ensures the index pattern is only created if APM data is found
    const hasData = await hasHistoricalAgentData(setup);
    if (!hasData) {
      return false;
    }

    try {
      const apmIndexPatternTitle = getApmIndexPatternTitle(config);
      await withApmSpan('create_index_pattern_saved_object', () =>
        savedObjectsClient.create(
          'index-pattern',
          {
            ...apmIndexPattern.attributes,
            title: apmIndexPatternTitle,
          },
          {
            id: APM_STATIC_INDEX_PATTERN_ID,
            overwrite: false,
            namespace: spaceId,
          }
        )
      );
      return true;
    } catch (e) {
      // if the index pattern (saved object) already exists a conflict error (code: 409) will be thrown
      // that error should be silenced
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        return false;
      }
      throw e;
    }
  });
}
