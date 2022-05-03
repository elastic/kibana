/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { RuleParamsAndRefs } from '@kbn/alerting-plugin/server';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesNotificationParams } from '../legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyExtractRuleId } from './legacy_extract_rule_id';

/**
 * Extracts references and returns the saved object references.
 * NOTE: You should not have to add any new ones here at all, but this keeps consistency with the other
 * version(s) used for security_solution rules.
 *
 * How to add a new extracted references here (This should be rare or non-existent):
 * ---
 * Add a new file for extraction named: extract_<paramName>.ts, example: extract_foo.ts
 * Add a function into that file named: extract<ParamName>, example: extractFoo(logger, params.foo)
 * Add a new line below and concat together the new extract with existing ones like so:
 *
 * const legacyRuleIdReferences = legacyExtractRuleId(logger, params.ruleAlertId);
 * const fooReferences = extractFoo(logger, params.foo);
 * const returnReferences = [...legacyRuleIdReferences, ...fooReferences];
 *
 * Optionally you can remove any parameters you do not want to store within the Saved Object here:
 * const paramsWithoutSavedObjectReferences = { removeParam, ...otherParams };
 *
 * If you do remove params, then update the types in: security_solution/server/lib/detection_engine/notifications/legacy_rules_notification_alert_type.ts
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param logger Kibana injected logger
 * @param params The params of the base rule(s).
 * @returns The rule parameters and the saved object references to store.
 */
export const legacyExtractReferences = ({
  logger,
  params,
}: {
  logger: Logger;
  params: LegacyRulesNotificationParams;
}): RuleParamsAndRefs<LegacyRulesNotificationParams> => {
  const legacyRuleIdReferences = legacyExtractRuleId({
    logger,
    ruleAlertId: params.ruleAlertId,
  });
  const returnReferences = [...legacyRuleIdReferences];

  // Modify params if you want to remove any elements separately here. For legacy ruleAlertId, we do not remove the id and instead
  // keep it to both fail safe guard against manually removed saved object references or if there are migration issues and the saved object
  // references are removed. Also keeping it we can detect and log out a warning if the reference between it and the saved_object reference
  // array have changed between each other indicating the saved_object array is being mutated outside of this functionality
  const paramsWithoutSavedObjectReferences = { ...params };

  return {
    references: returnReferences,
    params: paramsWithoutSavedObjectReferences,
  };
};
