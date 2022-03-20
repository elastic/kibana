/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
} from '../../../../common/apm_saved_object_constants';
import { APMIndices } from '../../../saved_objects/apm_indices';
import { withApmSpan } from '../../../utils/with_apm_span';
import { ApmIndicesConfig } from './get_apm_indices';

export function saveApmIndices(
  savedObjectsClient: SavedObjectsClientContract,
  apmIndices: Partial<ApmIndicesConfig>
) {
  return withApmSpan('save_apm_indices', () =>
    savedObjectsClient.create<APMIndices>(
      APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
      { apmIndices: removeEmpty(apmIndices), isSpaceAware: true },
      { id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID, overwrite: true }
    )
  );
}

// remove empty/undefined values
function removeEmpty(apmIndices: Partial<ApmIndicesConfig>) {
  return Object.entries(apmIndices)
    .map(([key, value]) => [key, value?.trim()])
    .filter(([_, value]) => !!value)
    .reduce((obj, [key, value]) => ({ ...obj, [key as string]: value }), {});
}
