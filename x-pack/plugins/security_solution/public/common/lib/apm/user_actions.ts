/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_ACTIONS_PREFIX = 'securitySolution';

export const SINGLE_RULE_ACTIONS = {
  ENABLE: `${SECURITY_ACTIONS_PREFIX} singleRuleActions enable`,
  DISABLE: `${SECURITY_ACTIONS_PREFIX} singleRuleActions disable`,
  DUPLICATE: `${SECURITY_ACTIONS_PREFIX} singleRuleActions duplicate`,
  EXPORT: `${SECURITY_ACTIONS_PREFIX} singleRuleActions export`,
  DELETE: `${SECURITY_ACTIONS_PREFIX} singleRuleActions delete`,
  PREVIEW: `${SECURITY_ACTIONS_PREFIX} singleRuleActions preview`,
  SAVE: `${SECURITY_ACTIONS_PREFIX} singleRuleActions save`,
};

export const BULK_RULE_ACTIONS = {
  ENABLE: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions enable`,
  DISABLE: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions disable`,
  DUPLICATE: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions duplicate`,
  EXPORT: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions export`,
  DELETE: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions delete`,
  EDIT: `${SECURITY_ACTIONS_PREFIX} bulkRuleActions edit`,
};

export const RULES_TABLE_ACTIONS = {
  REFRESH: `${SECURITY_ACTIONS_PREFIX} rulesTable refresh`,
  FILTER: `${SECURITY_ACTIONS_PREFIX} rulesTable filter`,
  LOAD_PREBUILT: `${SECURITY_ACTIONS_PREFIX} rulesTable loadPrebuilt`,
  PREVIEW_ON: `${SECURITY_ACTIONS_PREFIX} rulesTable technicalPreview on`,
  PREVIEW_OFF: `${SECURITY_ACTIONS_PREFIX} rulesTable technicalPreview off`,
};
