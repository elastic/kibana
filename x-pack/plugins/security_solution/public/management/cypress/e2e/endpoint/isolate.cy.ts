/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { APP_CASES_PATH, APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { closeAllToasts } from '../../tasks/close_all_toasts';
import {
  checkEndpointListForOnlyIsolatedHosts,
  checkEndpointListForOnlyUnIsolatedHosts,
  checkFlyoutEndpointIsolation,
  createAgentPolicyTask,
  filterOutEndpoints,
  filterOutIsolatedHosts,
  isolateHostWithComment,
  openAlertDetails,
  openCaseAlertDetails,
  releaseHostWithComment,
  toggleRuleOffAndOn,
  visitRuleAlerts,
  waitForReleaseOption,
} from '../../tasks/isolate';
import { cleanupCase, cleanupRule, loadCase, loadRule } from '../../tasks/api_fixtures';
import { ENDPOINT_VM_NAME } from '../../tasks/common';
import { login } from '../../tasks/login';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  getAgentByHostName,
  getEndpointIntegrationVersion,
  reassignAgentPolicy,
} from '../../tasks/fleet';

describe('Isolate command', () => {
  const endpointHostname = Cypress.env(ENDPOINT_VM_NAME);
  const isolateComment = `Isolating ${endpointHostname}`;
  const releaseComment = `Releasing ${endpointHostname}`;

  beforeEach(() => {
    login();
  });

  describe('From manage', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });

      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          response = data;
        })
      );
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
    });

    it('should allow filtering endpoint by Isolated status', () => {
      cy.visit(APP_ENDPOINTS_PATH);
      closeAllToasts();
      checkEndpointListForOnlyUnIsolatedHosts();

      filterOutIsolatedHosts();
      cy.contains('No items found');
      cy.getByTestSubj('adminSearchBar').click().type('{selectall}{backspace}');
      cy.getByTestSubj('querySubmitButton').click();
      cy.getByTestSubj('endpointTableRowActions').click();
      cy.getByTestSubj('isolateLink').click();

      cy.contains(`Isolate host ${endpointHostname} from network.`);
      cy.getByTestSubj('endpointHostIsolationForm');
      cy.getByTestSubj('host_isolation_comment').type(isolateComment);
      cy.getByTestSubj('hostIsolateConfirmButton').click();
      cy.contains(`Isolation on host ${endpointHostname} successfully submitted`);
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.getByTestSubj('rowHostStatus-actionStatuses').should('contain.text', 'Isolated');
      filterOutIsolatedHosts();

      checkEndpointListForOnlyIsolatedHosts();

      cy.getByTestSubj('endpointTableRowActions').click();
      cy.getByTestSubj('unIsolateLink').click();
      releaseHostWithComment(releaseComment, endpointHostname);
      cy.contains('Confirm').click();
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.getByTestSubj('adminSearchBar').click().type('{selectall}{backspace}');
      cy.getByTestSubj('querySubmitButton').click();
      checkEndpointListForOnlyUnIsolatedHosts();
    });
  });

  describe('From alerts', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;
    let ruleId: string;
    let ruleName: string;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });

      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          response = data;
        })
      );
      loadRule(false).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
      if (ruleId) {
        cleanupRule(ruleId);
      }
    });

    it('should have generated endpoint and rule', () => {
      cy.visit(APP_ENDPOINTS_PATH);
      cy.contains(endpointHostname).should('exist');

      toggleRuleOffAndOn(ruleName);
    });

    it('should isolate and release host', () => {
      visitRuleAlerts(ruleName);

      filterOutEndpoints(endpointHostname);

      closeAllToasts();
      openAlertDetails();

      isolateHostWithComment(isolateComment, endpointHostname);

      cy.getByTestSubj('hostIsolateConfirmButton').click();
      cy.contains(`Isolation on host ${endpointHostname} successfully submitted`);

      cy.getByTestSubj('euiFlyoutCloseButton').click();
      openAlertDetails();

      checkFlyoutEndpointIsolation();

      releaseHostWithComment(releaseComment, endpointHostname);
      cy.contains('Confirm').click();

      cy.contains(`Release on host ${endpointHostname} successfully submitted`);
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      openAlertDetails();
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.get('[title="Isolated"]').should('not.exist');
      });
    });
  });

  describe('From cases', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;
    let ruleId: string;
    let ruleName: string;
    let caseId: string;

    const caseOwner = 'securitySolution';

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });
      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          response = data;
        })
      );

      loadRule(false).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
      loadCase(caseOwner).then((data) => {
        caseId = data.id;
      });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
      if (ruleId) {
        cleanupRule(ruleId);
      }
      if (caseId) {
        cleanupCase(caseId);
      }
    });

    it('should have generated endpoint and rule', () => {
      cy.visit(APP_ENDPOINTS_PATH);
      cy.contains(endpointHostname).should('exist');

      toggleRuleOffAndOn(ruleName);
    });

    it('should isolate and release host', () => {
      visitRuleAlerts(ruleName);
      filterOutEndpoints(endpointHostname);
      closeAllToasts();

      openAlertDetails();

      cy.getByTestSubj('add-to-existing-case-action').click();
      cy.getByTestSubj(`cases-table-row-select-${caseId}`).click();
      cy.contains(`An alert was added to \"Test ${caseOwner} case`);

      cy.intercept('GET', `/api/cases/${caseId}/user_actions/_find*`).as('case');
      cy.visit(`${APP_CASES_PATH}/${caseId}`);
      cy.wait('@case', { timeout: 30000 }).then(({ response: res }) => {
        const caseAlertId = res?.body.userActions[1].id;

        closeAllToasts();
        openCaseAlertDetails(caseAlertId);
        isolateHostWithComment(isolateComment, endpointHostname);
        cy.getByTestSubj('hostIsolateConfirmButton').click();

        cy.getByTestSubj('euiFlyoutCloseButton').click();

        cy.getByTestSubj('user-actions-list').within(() => {
          cy.contains(isolateComment);
          cy.get('[aria-label="lock"]').should('exist');
          cy.get('[aria-label="lockOpen"]').should('not.exist');
        });

        waitForReleaseOption(caseAlertId);

        releaseHostWithComment(releaseComment, endpointHostname);

        cy.contains('Confirm').click();

        cy.contains(`Release on host ${endpointHostname} successfully submitted`);
        cy.getByTestSubj('euiFlyoutCloseButton').click();

        cy.getByTestSubj('user-actions-list').within(() => {
          cy.contains(releaseComment);
          cy.contains(isolateComment);
          cy.get('[aria-label="lock"]').should('exist');
          cy.get('[aria-label="lockOpen"]').should('exist');
        });

        openCaseAlertDetails(caseAlertId);

        cy.getByTestSubj('event-field-agent.status').then(($status) => {
          if ($status.find('[title="Isolated"]').length > 0) {
            cy.getByTestSubj('euiFlyoutCloseButton').click();
            cy.getByTestSubj(`comment-action-show-alert-${caseAlertId}`).click();
            cy.getByTestSubj('take-action-dropdown-btn').click();
          }
          cy.get('[title="Isolated"]').should('not.exist');
        });
      });
    });
  });
});
