/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_AGENT_BUTTON } from '../screens/fleet';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
  before(() => {
    navigateTo(FLEET);
  });

  it('Displays Add agent button once Fleet Agent page loaded', () => {
    cy.get(ADD_AGENT_BUTTON).contains('Add agent');
  });
});
