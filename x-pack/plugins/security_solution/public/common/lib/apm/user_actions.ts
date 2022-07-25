/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../../common/constants';

export const SINGLE_RULE_ACTIONS = {
  ENABLE: `${APP_UI_ID} singleRuleActions enable`,
  DISABLE: `${APP_UI_ID} singleRuleActions disable`,
  DUPLICATE: `${APP_UI_ID} singleRuleActions duplicate`,
  EXPORT: `${APP_UI_ID} singleRuleActions export`,
  DELETE: `${APP_UI_ID} singleRuleActions delete`,
  PREVIEW: `${APP_UI_ID} singleRuleActions preview`,
  SAVE: `${APP_UI_ID} singleRuleActions save`,
};

export const BULK_RULE_ACTIONS = {
  ENABLE: `${APP_UI_ID} bulkRuleActions enable`,
  DISABLE: `${APP_UI_ID} bulkRuleActions disable`,
  DUPLICATE: `${APP_UI_ID} bulkRuleActions duplicate`,
  EXPORT: `${APP_UI_ID} bulkRuleActions export`,
  DELETE: `${APP_UI_ID} bulkRuleActions delete`,
  EDIT: `${APP_UI_ID} bulkRuleActions edit`,
};

export const RULES_TABLE_ACTIONS = {
  REFRESH: `${APP_UI_ID} rulesTable refresh`,
  FILTER: `${APP_UI_ID} rulesTable filter`,
  LOAD_PREBUILT: `${APP_UI_ID} rulesTable loadPrebuilt`,
  PREVIEW_ON: `${APP_UI_ID} rulesTable technicalPreview on`,
  PREVIEW_OFF: `${APP_UI_ID} rulesTable technicalPreview off`,
};
