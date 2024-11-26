/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule, OriginalRuleVendor } from '../../model/rule_migration.gen';
import type { QueryResourceIdentifier, RuleResourceCollection } from './types';
import { splResourceIdentifier } from './splunk_identifier';

export const getRuleResourceIdentifier = (rule: OriginalRule): QueryResourceIdentifier => {
  return ruleResourceIdentifiers[rule.vendor];
};

export const identifyRuleResources = (rule: OriginalRule): RuleResourceCollection => {
  return getRuleResourceIdentifier(rule)(rule.query);
};

const ruleResourceIdentifiers: Record<OriginalRuleVendor, QueryResourceIdentifier> = {
  splunk: splResourceIdentifier,
};
