/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { SavedObject } from '../../../../../src/core/types/saved_objects';
import { RuleTypeRegistry } from '../rule_type_registry';
import type { RawAlert } from '../types';

export function isRuleExportable(
  rule: SavedObject,
  ruleTypeRegistry: RuleTypeRegistry,
  logger: Logger
): boolean {
  const ruleSO = rule as SavedObject<RawAlert>;
  try {
    const ruleType = ruleTypeRegistry.get(ruleSO.attributes.alertTypeId);
    if (!ruleType.isExportable) {
      logger.warn(
        `Skipping export of rule "${ruleSO.id}" because rule type "${ruleSO.attributes.alertTypeId}" is not exportable through this interface.`
      );
    }

    return ruleType.isExportable;
  } catch (err) {
    logger.warn(
      `Skipping export of rule "${ruleSO.id}" because rule type "${ruleSO.attributes.alertTypeId}" is not recognized.`
    );
    return false;
  }
}
