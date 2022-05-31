/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';

import { SAVED_OBJECT_TYPES } from '@kbn/cases-plugin/common/constants';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../lib/detection_engine/rule_actions/legacy_saved_object_mappings';

export async function getInternalSavedObjectsClient(
  core: CoreSetup
): Promise<SavedObjectsClientContract> {
  return core.getStartServices().then(async ([coreStart]) => {
    // note: we include the "cases" and "alert" hidden types here otherwise we would not be able to query them. If at some point cases and alert is not considered a hidden type this can be removed
    return coreStart.savedObjects.createInternalRepository([
      'alert',
      legacyRuleActionsSavedObjectType,
      ...SAVED_OBJECT_TYPES,
    ]) as unknown as SavedObjectsClientContract;
  });
}
