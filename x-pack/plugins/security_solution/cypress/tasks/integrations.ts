/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_BTN,
  INTEGRATION_ADDED_POP_UP,
  QUEUE_URL,
  SAVE_AND_CONTINUE_BTN,
} from '../screens/integrations';

import { visit } from './login';

export const installAwsCloudFrontWithPolicy = () => {
  visit('app/integrations/detail/aws-1.17.0/overview?integration=cloudfront');
  cy.get(ADD_INTEGRATION_BTN).click();
  cy.get(QUEUE_URL).type('http://www.example.com');

  // Fleet installs an integration very slowly, so we have to increase the timeout here.
  cy.get(SAVE_AND_CONTINUE_BTN).click();
  cy.get(INTEGRATION_ADDED_POP_UP, { timeout: 120000 }).should('exist');
};
