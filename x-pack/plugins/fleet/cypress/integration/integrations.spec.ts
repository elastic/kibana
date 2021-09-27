/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEADER } from '../screens/osquery';

import { INTEGRATIONS, openNavigationFlyout, navigateTo } from '../tasks/navigation';
import { addIntegration } from '../tasks/integrations';
import { INTEGRATION_LINK } from '../screens/integrations';

describe('Add Integration', () => {
  before(() => {
    navigateTo(INTEGRATIONS);
    addIntegration('Apache');
  });

  it('Displays Apache integration in the Policies list once installed ', () => {
    cy.get(INTEGRATION_LINK).contains('apache-1');
  });
});
