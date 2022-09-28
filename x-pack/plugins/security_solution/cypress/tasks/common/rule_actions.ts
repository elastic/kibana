/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_ACTION_BTN, SLACK_ACTION_MESSAGE_TEXTAREA } from '../../screens/common/rule_actions';

export const addSlackRuleAction = (message: string) => {
  cy.get(SLACK_ACTION_BTN).click();
  cy.get(SLACK_ACTION_MESSAGE_TEXTAREA).clear().type(message);
};
