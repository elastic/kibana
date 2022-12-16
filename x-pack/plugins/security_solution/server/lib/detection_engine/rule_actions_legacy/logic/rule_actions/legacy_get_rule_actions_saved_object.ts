/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindOptionsReference, Logger } from '@kbn/core/server';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';

// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import type {
  LegacyIRuleActionsAttributesSavedObjectAttributes,
  LegacyRuleAlertAction,
} from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsFromSavedObject } from './legacy_utils';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyGetRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  logger: Logger;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyRulesActionsSavedObject {
  id: string;
  actions: LegacyRuleAlertAction[];
  alertThrottle: string | null;
  ruleThrottle: string;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  logger,
}: LegacyGetRuleActionsSavedObject): Promise<LegacyRulesActionsSavedObject | null> => {
  const reference: SavedObjectsFindOptionsReference = {
    id: ruleAlertId,
    type: 'alert',
  };
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_objects,
  } = await savedObjectsClient.find<LegacyIRuleActionsAttributesSavedObjectAttributes>({
    type: legacyRuleActionsSavedObjectType,
    perPage: 1,
    hasReference: reference,
  });

  if (!saved_objects[0]) {
    return null;
  } else {
    return legacyGetRuleActionsFromSavedObject(saved_objects[0], logger);
  }
};
