/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { TriggersActionsPageProvider } from '../../functional_with_es_ssl/page_objects/triggers_actions_ui_page';
import { RuleDetailsPageProvider } from '../../functional_with_es_ssl/page_objects/rule_details';

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  triggersActionsUI: TriggersActionsPageProvider,
  ruleDetailsUI: RuleDetailsPageProvider,
};
