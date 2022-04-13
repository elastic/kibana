/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enrichFilterWithAlertTypes } from './enrich_filter_with_alert_types'

import { BulkEditRulesOptions } from './types';

export const bulkEditRules = ({
  rulesClient,
  ids,
  operations,
  filter,
  paramsModifier,
  isRuleRegistryEnabled,
}: BulkEditRulesOptions) => {
  return rulesClient.bulkEdit({
    ids,
    operations,
    paramsModifier,
    filter: enrichFilterWithAlertTypes(filter, isRuleRegistryEnabled),
  });
};

