/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from '@kbn/core/server';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesNotificationParams } from '../legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyInjectRuleIdReferences } from './legacy_inject_rule_id_references';

/**
 * Injects references and returns the saved object references.
 * How to add a new injected references here (NOTE: We do not expect to add more here but we leave this as the same pattern we have in other reference sections):
 * ---
 * Add a new file for injection named: legacy_inject_<paramName>.ts, example: legacy_inject_foo.ts
 * Add a new function into that file named: legacy_inject<ParamName>, example: legacyInjectFooReferences(logger, params.foo)
 * Add a new line below and spread the new parameter together like so:
 *
 * const foo = legacyInjectFooReferences(logger, params.foo, savedObjectReferences);
 * const ruleParamsWithSavedObjectReferences: RuleParams = {
 *   ...params,
 *   foo,
 *   ruleAlertId,
 * };
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param logger Kibana injected logger
 * @param params The params of the base rule(s).
 * @param savedObjectReferences The saved object references to merge with the rule params
 * @returns The rule parameters with the saved object references.
 */
export const legacyInjectReferences = ({
  logger,
  params,
  savedObjectReferences,
}: {
  logger: Logger;
  params: LegacyRulesNotificationParams;
  savedObjectReferences: SavedObjectReference[];
}): LegacyRulesNotificationParams => {
  const ruleAlertId = legacyInjectRuleIdReferences({
    logger,
    ruleAlertId: params.ruleAlertId,
    savedObjectReferences,
  });
  const ruleParamsWithSavedObjectReferences: LegacyRulesNotificationParams = {
    ...params,
    ruleAlertId,
  };
  return ruleParamsWithSavedObjectReferences;
};
