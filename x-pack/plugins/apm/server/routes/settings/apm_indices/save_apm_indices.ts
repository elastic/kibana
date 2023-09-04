/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import {
  APMIndicesSavedObjectBody,
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '@kbn/apm-data-access-plugin/server/saved_objects/apm_indices';
import { withApmSpan } from '../../../utils/with_apm_span';

export function saveApmIndices(
  savedObjectsClient: SavedObjectsClientContract,
  apmIndices: Partial<APMIndices>
) {
  return withApmSpan('save_apm_indices', () =>
    savedObjectsClient.create<APMIndicesSavedObjectBody>(
      APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
      { apmIndices: removeEmpty(apmIndices), isSpaceAware: true },
      { id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID, overwrite: true }
    )
  );
}

// remove empty/undefined values
function removeEmpty(apmIndices: Partial<APMIndices>) {
  return Object.entries(apmIndices)
    .map(([key, value]) => [key, value?.trim()])
    .filter(([_, value]) => !!value)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, unknown>);
}
