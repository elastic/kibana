/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, INTEGRATIONS } from '../tasks/navigation';
import { createUsers, BuiltInViewerUser, deleteUsers } from '../tasks/privileges';
import { loginWithUserAndWaitForPage, logout } from '../tasks/login';

import { getIntegrationCard } from '../screens/integrations';

import { MISSING_PRIVILEGES } from '../screens/fleet';
import { ADD_INTEGRATION_POLICY_BTN } from '../screens/integrations';
import { scrollToIntegration } from '../tasks/integrations';

const usersToCreate = [BuiltInViewerUser];

// This role behaves like Fleet -> None, Integrations -> Read
describe('When the user has Viewer built-in role', () => {
  before(() => {
    createUsers(usersToCreate);
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsers(usersToCreate);
  });

  describe('Fleet', () => {
    it('is blocked with a callout', () => {
      loginWithUserAndWaitForPage(FLEET, BuiltInViewerUser);
      cy.getBySel(MISSING_PRIVILEGES.TITLE).should('have.text', 'Permission denied');
      cy.getBySel(MISSING_PRIVILEGES.MESSAGE).should(
        'contain',
        'You are not authorized to access Fleet.'
      );
    });
  });

  describe('Integrations', () => {
    it('are visible but cannot be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, BuiltInViewerUser);
      scrollToIntegration(getIntegrationCard('apache'));
      cy.getBySel(getIntegrationCard('apache')).click();
      cy.getBySel(ADD_INTEGRATION_POLICY_BTN).should('be.disabled');
    });
  });
});
