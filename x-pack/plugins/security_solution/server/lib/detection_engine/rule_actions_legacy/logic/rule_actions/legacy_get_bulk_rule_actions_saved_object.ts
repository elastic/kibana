/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { SavedObjectsFindOptionsReference, Logger } from '@kbn/core/server';

import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import type { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsFromSavedObject } from './legacy_utils';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesActionsSavedObject } from './legacy_get_rule_actions_saved_object';
import { initPromisePool } from '../../../../../utils/promise_pool';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyGetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  logger: Logger;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
  logger,
}: LegacyGetBulkRuleActionsSavedObject): Promise<Record<string, LegacyRulesActionsSavedObject>> => {
  const references = alertIds.map<SavedObjectsFindOptionsReference>((alertId) => ({
    id: alertId,
    type: 'alert',
  }));
  const { results, errors } = await initPromisePool({
    concurrency: 1,
    items: chunk(references, 1000),
    executor: (referencesChunk) =>
      savedObjectsClient
        .find<LegacyIRuleActionsAttributesSavedObjectAttributes>({
          type: legacyRuleActionsSavedObjectType,
          perPage: 10000,
          hasReference: referencesChunk,
        })
        .catch((error) => {
          logger.error(
            `Error fetching rule actions: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }),
  });
  if (errors.length) {
    throw new AggregateError(errors, 'Error fetching rule actions');
  }

  const savedObjects = results.flatMap(({ result }) => result.saved_objects);
  return savedObjects.reduce(
    (acc: { [key: string]: LegacyRulesActionsSavedObject }, savedObject) => {
      const ruleAlertId = savedObject.references.find((reference) => {
        // Find the first rule alert and assume that is the one we want since we should only ever have 1.
        return reference.type === 'alert';
      });
      // We check to ensure we have found a "ruleAlertId" and hopefully we have.
      const ruleAlertIdKey = ruleAlertId != null ? ruleAlertId.id : undefined;
      if (ruleAlertIdKey != null) {
        acc[ruleAlertIdKey] = legacyGetRuleActionsFromSavedObject(savedObject, logger);
      } else {
        logger.error(
          `Security Solution notification (Legacy) Was expecting to find a reference of type "alert" within ${savedObject.references} but did not. Skipping this notification.`
        );
      }
      return acc;
    },
    {}
  );
};
