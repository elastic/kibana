/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

import { chunk } from 'lodash';
import type { SavedObjectsFindOptionsReference, Logger } from '@kbn/core/server';
import pMap from 'p-map';
import { RuleAction, Rule } from '../../types';
import type { RuleExecutorServices } from '../..';
import { injectReferencesIntoActions } from '../common';

import {
  transformFromLegacyActions,
  LegacyIRuleActionsAttributes,
  legacyRuleActionsSavedObjectType,
} from './migrate_legacy_actions';
/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
interface LegacyGetBulkRuleActionsSavedObject {
  alertIds: string[];
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'];
  logger: Logger;
}

interface LegacyActionsObj {
  ruleThrottle: string | null;
  legacyRuleActions: RuleAction[];
  legacyActionsReferences: SavedObjectReference[];
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
const legacyGetBulkRuleActionsSavedObject = async ({
  alertIds,
  savedObjectsClient,
  logger,
}: LegacyGetBulkRuleActionsSavedObject): Promise<Record<string, LegacyActionsObj>> => {
  const references = alertIds.map<SavedObjectsFindOptionsReference>((alertId) => ({
    id: alertId,
    type: 'alert',
  }));
  const errors: unknown[] = [];

  const results = await pMap(
    chunk(references, 1000),
    async (referencesChunk) => {
      try {
        return savedObjectsClient.find<LegacyIRuleActionsAttributes>({
          type: legacyRuleActionsSavedObjectType,
          perPage: 10000,
          hasReference: referencesChunk,
        });
      } catch (error) {
        logger.error(
          `Error fetching rule actions: ${error instanceof Error ? error.message : String(error)}`
        );
        errors.push(error);
        return [];
      }
    },
    { concurrency: 1 }
  );

  const actionSavedObjects = results.flat().flatMap((r) => r.saved_objects);

  if (errors.length) {
    throw new AggregateError(errors, 'Error fetching rule actions');
  }

  return actionSavedObjects.reduce((acc: { [key: string]: LegacyActionsObj }, savedObject) => {
    const ruleAlertId = savedObject.references.find((reference) => {
      // Find the first rule alert and assume that is the one we want since we should only ever have 1.
      return reference.type === 'alert';
    });
    // We check to ensure we have found a "ruleAlertId" and hopefully we have.
    const ruleAlertIdKey = ruleAlertId != null ? ruleAlertId.id : undefined;
    if (ruleAlertIdKey != null) {
      const legacyRawActions = transformFromLegacyActions(
        savedObject.attributes,
        savedObject.references
      );
      acc[ruleAlertIdKey] = {
        ruleThrottle: savedObject.attributes.ruleThrottle,
        legacyActionsReferences: savedObject.references,
        //  legacyActions: transformFromLegacyActions(savedObject.attributes, savedObject.references),
        legacyRuleActions: injectReferencesIntoActions(
          ruleAlertIdKey,
          legacyRawActions,
          savedObject.references
        ),
      };
    } else {
      logger.error(
        `Security Solution notification (Legacy) Was expecting to find a reference of type "alert" within ${savedObject.references} but did not. Skipping this notification.`
      );
    }
    return acc;
  }, {});
};

export const formatLegacyActionsForSiemRules = async <T extends Rule>(
  rules: T[],
  { logger, savedObjectsClient }: Omit<LegacyGetBulkRuleActionsSavedObject, 'alertIds'>
): Promise<T[]> => {
  const res = await legacyGetBulkRuleActionsSavedObject({
    alertIds: rules.map((rule) => rule.id),
    savedObjectsClient,
    logger,
  });

  return rules.map((rule) => {
    const legacyRuleActions = res[rule.id]?.legacyRuleActions ?? [];
    return {
      ...rule,
      actions: [...rule.actions, ...legacyRuleActions],
      throttle: legacyRuleActions.length ? res[rule.id]?.ruleThrottle : rule.throttle,
      // muteAll property is disregarded in further rule processing in Security Solution when legacy actions are present.
      // So it should be safe to set it as false, so it won't be displayed to user as w/o actions see transformFromAlertThrottle method
      muteAll: legacyRuleActions.length ? false : rule.muteAll,
    };
  });
};
