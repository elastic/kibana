/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openAlertDetailsView } from '../../screens/alerts';
import { APP_CASES_PATH, APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { closeAllToasts } from '../../tasks/toasts';
import {
  checkEndpointListForOnlyIsolatedHosts,
  checkEndpointListForOnlyUnIsolatedHosts,
  checkFlyoutEndpointIsolation,
  filterOutIsolatedHosts,
  isolateHostWithComment,
  openCaseAlertDetails,
  releaseHostWithComment,
  toggleRuleOffAndOn,
  visitRuleAlerts,
  waitForReleaseOption,
} from '../../tasks/isolate';
import { cleanupCase, cleanupRule, loadCase, loadRule } from '../../tasks/api_fixtures';
import { login } from '../../tasks/login';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';

const getReleaseComment = (hostname: string) => `Releasing ${hostname}`;
const getIsolateComment = (hostname: string) => `Isolating ${hostname}`;

describe.skip('Isolate command', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login();
    disableExpandableFlyoutAdvancedSettings();
  });

  describe('From manage', () => {
    it('should allow filtering endpoint by Isolated status', () => {
      loadPage(APP_ENDPOINTS_PATH);
      closeAllToasts();
      cy.getByTestSubj('globalLoadingIndicator-hidden').should('exist');
      checkEndpointListForOnlyUnIsolatedHosts();

      filterOutIsolatedHosts();
      cy.contains('No items found');
      cy.getByTestSubj('adminSearchBar').type('{selectall}{backspace}');
      cy.getByTestSubj('querySubmitButton').click();
      cy.getByTestSubj('endpointTableRowActions').click();
      cy.getByTestSubj('isolateLink').click();

      cy.getCreatedHostData().then((hostData) => {
        cy.contains(`Isolate host ${hostData.createdHost.hostname} from network.`);
        cy.getByTestSubj('endpointHostIsolationForm');
        cy.getByTestSubj('host_isolation_comment').type(
          getIsolateComment(hostData.createdHost.hostname)
        );
        cy.getByTestSubj('hostIsolateConfirmButton').click();
        cy.contains(`Isolation on host ${hostData.createdHost.hostname} successfully submitted`);
      });
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.getByTestSubj('rowHostStatus-actionStatuses').should('contain.text', 'Isolated');
      filterOutIsolatedHosts();

      checkEndpointListForOnlyIsolatedHosts();

      cy.getByTestSubj('endpointTableRowActions').click();
      cy.getByTestSubj('unIsolateLink').click();
      cy.getCreatedHostData().then((hostData) =>
        releaseHostWithComment(
          getReleaseComment(hostData.createdHost.hostname),
          hostData.createdHost.hostname
        )
      );

      cy.contains('Confirm').click();
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.getByTestSubj('adminSearchBar').type('{selectall}{backspace}');
      cy.getByTestSubj('querySubmitButton').click();
      checkEndpointListForOnlyUnIsolatedHosts();
    });
  });

  describe('From alerts', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      cy.getCreatedHostData()
        .then((hostData) =>
          loadRule(
            { query: `agent.name: ${hostData.createdHost.hostname} and agent.type: endpoint` },
            false
          )
        )
        .then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
    });

    after(() => {
      if (ruleId) {
        cleanupRule(ruleId);
      }
    });

    it('should isolate and release host', () => {
      loadPage(APP_ENDPOINTS_PATH);
      cy.getCreatedHostData().then((hostData) => {
        const createdHost = hostData.createdHost;
        const isolateComment = getIsolateComment(createdHost.hostname);
        const releaseComment = getReleaseComment(createdHost.hostname);

        cy.contains(createdHost.hostname).should('exist');

        toggleRuleOffAndOn(ruleName);
        visitRuleAlerts(ruleName);

        closeAllToasts();
        openAlertDetailsView();

        isolateHostWithComment(isolateComment, createdHost.hostname);

        cy.getByTestSubj('hostIsolateConfirmButton').click();
        cy.contains(`Isolation on host ${createdHost.hostname} successfully submitted`);

        cy.getByTestSubj('euiFlyoutCloseButton').click();
        openAlertDetailsView();

        checkFlyoutEndpointIsolation();

        releaseHostWithComment(releaseComment, createdHost.hostname);
        cy.contains('Confirm').click();

        cy.contains(`Release on host ${createdHost.hostname} successfully submitted`);
        cy.getByTestSubj('euiFlyoutCloseButton').click();
        openAlertDetailsView();
        cy.getByTestSubj('event-field-agent.status').within(() => {
          cy.get('[title="Isolated"]').should('not.exist');
        });
      });
    });
  });

  describe('From cases', () => {
    let ruleId: string;
    let ruleName: string;
    let caseId: string;

    const caseOwner = 'securitySolution';

    before(() => {
      cy.getCreatedHostData()
        .then((hostData) =>
          loadRule(
            { query: `agent.name: ${hostData.createdHost.hostname} and agent.type: endpoint` },
            false
          )
        )
        .then((data) => {
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
      if (ruleId) {
        cleanupRule(ruleId);
      }
      if (caseId) {
        cleanupCase(caseId);
      }
    });

    it('should isolate and release host', () => {
      loadPage(APP_ENDPOINTS_PATH);
      cy.getCreatedHostData().then((hostData) => {
        const createdHost = hostData.createdHost;
        const isolateComment = getIsolateComment(createdHost.hostname);
        const releaseComment = getReleaseComment(createdHost.hostname);

        cy.contains(createdHost.hostname).should('exist');

        toggleRuleOffAndOn(ruleName);

        visitRuleAlerts(ruleName);
        closeAllToasts();

        openAlertDetailsView();

        cy.getByTestSubj('add-to-existing-case-action').click();
        cy.getByTestSubj(`cases-table-row-select-${caseId}`).click();
        cy.contains(`An alert was added to \"Test ${caseOwner} case`);

        cy.intercept('GET', `/api/cases/${caseId}/user_actions/_find*`).as('case');
        loadPage(`${APP_CASES_PATH}/${caseId}`);
        cy.wait('@case', { timeout: 30000 }).then(({ response: res }) => {
          const caseAlertId = res?.body.userActions[1].id;

          closeAllToasts();
          openCaseAlertDetails(caseAlertId);
          isolateHostWithComment(isolateComment, createdHost.hostname);
          cy.getByTestSubj('hostIsolateConfirmButton').click();

          cy.getByTestSubj('euiFlyoutCloseButton').click();

          cy.getByTestSubj('user-actions-list').within(() => {
            cy.contains(isolateComment);
            cy.get('[aria-label="lock"]').should('exist');
            cy.get('[aria-label="lockOpen"]').should('not.exist');
          });

          waitForReleaseOption(caseAlertId);

          releaseHostWithComment(releaseComment, createdHost.hostname);

          cy.contains('Confirm').click();

          cy.contains(`Release on host ${createdHost.hostname} successfully submitted`);
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
});
