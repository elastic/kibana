/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import {
  apmIndexPattern,
  APM_STATIC_INDEX_PATTERN_ID,
} from '../../../../../../src/plugins/apm_oss/server';
import { hasHistoricalAgentData } from '../services/get_services/has_historical_agent_data';
import { Setup } from '../helpers/setup_request';
import { APMRequestHandlerContext } from '../../routes/typings';
import { InternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client.js';

export async function createStaticIndexPattern(
  setup: Setup,
  context: APMRequestHandlerContext,
  savedObjectsClient: InternalSavedObjectsClient
): Promise<void> {
  const { config } = context;

  // don't autocreate APM index pattern if it's been disabled via the config
  if (!config['xpack.apm.autocreateApmIndexPattern']) {
    return;
  }

  // Discover and other apps will throw errors if an index pattern exists without having matching indices.
  // The following ensures the index pattern is only created if APM data is found
  const hasData = await hasHistoricalAgentData(setup);
  if (!hasData) {
    return;
  }

  try {
    const apmIndexPatternTitle = config['apm_oss.indexPattern'];
    await savedObjectsClient.create(
      'index-pattern',
      {
        ...apmIndexPattern.attributes,
        title: apmIndexPatternTitle,
      },
      { id: APM_STATIC_INDEX_PATTERN_ID, overwrite: false }
    );
    return;
  } catch (e) {
    // if the index pattern (saved object) already exists a conflict error (code: 409) will be thrown
    // that error should be silenced
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      return;
    }
    throw e;
  }
}
