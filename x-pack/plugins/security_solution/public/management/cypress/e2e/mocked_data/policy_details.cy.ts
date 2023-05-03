/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkMalwareUserNotificationInOpenedPolicy,
  visitPolicyDetailsPage,
} from '../../screens/policy_details';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';
import { login } from '../../tasks/login';
import { expectAndCloseSuccessToast } from '../../tasks/toasts';

describe('Policy Details', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
  });

  beforeEach(() => {
    login();
    visitPolicyDetailsPage();
  });

  describe('Malware Protection card', () => {
    it('user should be able to see related rules', () => {
      cy.getByTestSubj('malwareProtectionsForm').contains('related detection rules').click();

      cy.url().should('contain', 'app/security/rules/management');
    });

    it('changing protection level should enable or disable user notification', () => {
      cy.getByTestSubj('malwareProtectionSwitch').click();
      cy.getByTestSubj('malwareProtectionSwitch').should('have.attr', 'aria-checked', 'true');

      // Default: Prevent + Notify user enabled
      cy.getByTestSubj('malwareProtectionMode_prevent').find('input').should('be.checked');
      cy.getByTestSubj('malwareUserNotificationCheckbox').should('be.checked');

      // Changing to Detect -> Notify user disabled
      cy.getByTestSubj('malwareProtectionMode_detect').find('label').click();
      cy.getByTestSubj('malwareUserNotificationCheckbox').should('not.be.checked');

      // Changing back to Prevent -> Notify user enabled
      cy.getByTestSubj('malwareProtectionMode_prevent').find('label').click();
      cy.getByTestSubj('malwareUserNotificationCheckbox').should('be.checked');
    });

    it('disabling protection should disable notification in yaml', () => {
      // Enable malware protection and user notification
      cy.getByTestSubj('malwareProtectionSwitch').click();
      cy.getByTestSubj('malwareProtectionSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getByTestSubj('policyDetailsSaveButton').click();
      cy.getByTestSubj('confirmModalConfirmButton').click();
      expectAndCloseSuccessToast();

      checkMalwareUserNotificationInOpenedPolicy({ isEnabled: true });

      // disable malware protection
      cy.getByTestSubj('malwareProtectionSwitch').click();
      cy.getByTestSubj('malwareProtectionSwitch').should('have.attr', 'aria-checked', 'false');
      cy.getByTestSubj('policyDetailsSaveButton').click();
      cy.getByTestSubj('confirmModalConfirmButton').click();
      expectAndCloseSuccessToast();

      checkMalwareUserNotificationInOpenedPolicy({ isEnabled: false });
    });
  });

  describe('Ransomware Protection card', () => {
    it('user should be able to see related rules', () => {
      cy.getByTestSubj('ransomwareProtectionsForm').contains('related detection rules').click();

      cy.url().should('contain', 'app/security/rules/management');
    });
  });
});
