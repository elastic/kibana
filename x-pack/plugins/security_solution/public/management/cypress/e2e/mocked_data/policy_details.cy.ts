/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProtectionModes } from '../../../../../common/endpoint/types';
import {
  PackagePolicyBackupHelper,
  savePolicyForm,
  visitPolicyDetailsPage,
  yieldPolicyConfig,
} from '../../screens/policy_details';
import type { CyIndexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';

describe('Policy Details', () => {
  const packagePolicyBackupHelper = new PackagePolicyBackupHelper();
  let indexedHostsData: CyIndexEndpointHosts;

  before(() => {
    login();
    indexEndpointHosts().then((results) => {
      indexedHostsData = results;
    });
    packagePolicyBackupHelper.backup();
  });

  beforeEach(() => {
    login();
    visitPolicyDetailsPage();
  });

  afterEach(() => {
    packagePolicyBackupHelper.restore();
  });

  after(() => {
    indexedHostsData.cleanup();
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

    it('disabling protection should disable notification in yaml for every OS', () => {
      // Enable malware protection and user notification
      cy.getByTestSubj('malwareProtectionSwitch').click();
      cy.getByTestSubj('malwareProtectionSwitch').should('have.attr', 'aria-checked', 'true');
      savePolicyForm();

      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.mac.popup.malware.enabled).to.equal(true);
        expect(policyConfig.windows.popup.malware.enabled).to.equal(true);
        expect(policyConfig.linux.popup.malware.enabled).to.equal(true);
      });

      // disable malware protection
      cy.getByTestSubj('malwareProtectionSwitch').click();
      cy.getByTestSubj('malwareProtectionSwitch').should('have.attr', 'aria-checked', 'false');
      savePolicyForm();

      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.mac.popup.malware.enabled).to.equal(false);
        expect(policyConfig.windows.popup.malware.enabled).to.equal(false);
        expect(policyConfig.linux.popup.malware.enabled).to.equal(false);
      });
    });

    it('user should be able to enable Malware protection for every OS in yaml', () => {
      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.linux.malware.mode).to.equal(ProtectionModes.off);
        expect(policyConfig.mac.malware.mode).to.equal(ProtectionModes.off);
        expect(policyConfig.windows.malware.mode).to.equal(ProtectionModes.off);
      });

      cy.getByTestSubj('malwareProtectionsForm').should('contain.text', 'Linux');
      cy.getByTestSubj('malwareProtectionsForm').should('contain.text', 'Windows');
      cy.getByTestSubj('malwareProtectionsForm').should('contain.text', 'Mac');

      cy.getByTestSubj('malwareProtectionSwitch').click();
      savePolicyForm();

      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.linux.malware.mode).to.equal(ProtectionModes.prevent);
        expect(policyConfig.mac.malware.mode).to.equal(ProtectionModes.prevent);
        expect(policyConfig.windows.malware.mode).to.equal(ProtectionModes.prevent);
      });
    });
  });

  describe('Ransomware Protection card', () => {
    it('user should be able to see related rules', () => {
      cy.getByTestSubj('ransomwareProtectionsForm').contains('related detection rules').click();

      cy.url().should('contain', 'app/security/rules/management');
    });

    it('changing protection level should enable or disable user notification', () => {
      cy.getByTestSubj('ransomwareProtectionSwitch').click();
      cy.getByTestSubj('ransomwareProtectionSwitch').should('have.attr', 'aria-checked', 'true');

      // Default: Prevent + Notify user enabled
      cy.getByTestSubj('ransomwareProtectionMode_prevent').find('input').should('be.checked');
      cy.getByTestSubj('ransomwareUserNotificationCheckbox').should('be.checked');

      // Changing to Detect -> Notify user disabled
      cy.getByTestSubj('ransomwareProtectionMode_detect').find('label').click();
      cy.getByTestSubj('ransomwareUserNotificationCheckbox').should('not.be.checked');

      // Changing back to Prevent -> Notify user enabled
      cy.getByTestSubj('ransomwareProtectionMode_prevent').find('label').click();
      cy.getByTestSubj('ransomwareUserNotificationCheckbox').should('be.checked');
    });
  });

  describe('Advanced settings', () => {
    it('should show empty text inputs except for some settings', () => {
      const settingsWithDefaultValues = [
        'mac.advanced.capture_env_vars',
        'linux.advanced.capture_env_vars',
      ];

      cy.getByTestSubj('advancedPolicyButton').click();

      cy.getByTestSubj('advancedPolicyPanel')
        .children()
        .each(($child) => {
          const settingName = $child.find('label').text();

          if (settingsWithDefaultValues.includes(settingName)) {
            cy.wrap($child).find('input').should('not.have.value', '');
          } else {
            cy.wrap($child).find('input').should('have.value', '');
          }
        });
    });

    it('should add advanced settings to policy yaml only when they are set', () => {
      // Initially config should only contain the two default entries
      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.linux.advanced).to.have.keys(['capture_env_vars']);
        expect(policyConfig.mac.advanced).to.have.keys(['capture_env_vars']);
        expect(policyConfig.windows.advanced).to.equal(undefined);
      });

      // Set agent.connection_delay entry for every OS
      cy.getByTestSubj('advancedPolicyButton').click();
      cy.getByTestSubj('advancedPolicyPanel')
        .children()
        .each(($child) => {
          const settingName = $child.find('label').text();

          if (settingName.includes('.agent.connection_delay')) {
            cy.wrap($child).find('input').type('66');
          }
        });
      savePolicyForm();

      // Validate yaml
      yieldPolicyConfig().then((policyConfig) => {
        expect(policyConfig.linux.advanced).to.have.keys(['capture_env_vars', 'agent']);
        expect(policyConfig.linux.advanced).to.have.deep.property('agent', {
          connection_delay: '66',
        });
        expect(policyConfig.mac.advanced).to.have.keys(['capture_env_vars', 'agent']);
        expect(policyConfig.mac.advanced).to.have.deep.property('agent', {
          connection_delay: '66',
        });
        expect(policyConfig.windows.advanced).to.have.keys(['agent']);
        expect(policyConfig.windows.advanced).to.have.deep.property('agent', {
          connection_delay: '66',
        });
      });
    });
  });
});
