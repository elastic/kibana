/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { ActionDetails } from '../../../../common/endpoint/types';

const API_ENDPOINT_ACTION_PATH = '/api/endpoint/action/*';
export const interceptActionRequests = (
  cb: (responseBody: ActionDetails) => void,
  alias: string
): void => {
  cy.intercept('POST', API_ENDPOINT_ACTION_PATH, (req) => {
    req.continue((res) => {
      const {
        body: { action, data },
      } = res;

      cb({ action, ...data });
    });
  }).as(alias);
};

export const sendActionResponse = (action: ActionDetails): void => {
  cy.task('sendHostActionResponse', {
    action,
    state: { state: 'success' },
  });
};

export const isolateHostWithComment = (comment: string, hostname: string): void => {
  cy.getByTestSubj('isolate-host-action-item').click();
  cy.contains(`Isolate host ${hostname} from network.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const releaseHostWithComment = (comment: string, hostname: string): void => {
  cy.contains(`${hostname} is currently isolated.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const openAlertDetails = (): void => {
  cy.getByTestSubj('expand-event').first().click();
  cy.getByTestSubj('take-action-dropdown-btn').click();
};

export const openCaseAlertDetails = (alertId: string): void => {
  cy.getByTestSubj(`comment-action-show-alert-${alertId}`).click();
  cy.getByTestSubj('take-action-dropdown-btn').click();
};

export const waitForReleaseOption = (alertId: string): void => {
  openCaseAlertDetails(alertId);
  cy.getByTestSubj('event-field-agent.status').then(($status) => {
    if ($status.find('[title="Isolated"]').length > 0) {
      cy.contains('Release host').click();
    } else {
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      openCaseAlertDetails(alertId);
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.contains('Isolated');
      });
      cy.contains('Release host').click();
    }
  });
};

export const visitRuleAlerts = (ruleName: string) => {
  cy.visit('/app/security/rules');
  cy.contains(ruleName).click();
};
export const checkFlyoutEndpointIsolation = (): void => {
  cy.getByTestSubj('event-field-agent.status').then(($status) => {
    if ($status.find('[title="Isolated"]').length > 0) {
      cy.contains('Release host').click();
    } else {
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.wait(5000);
      openAlertDetails();
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.contains('Isolated');
      });
      cy.contains('Release host').click();
    }
  });
};

export const toggleRuleOffAndOn = (ruleName: string): void => {
  cy.visit('/app/security/rules');
  cy.wait(2000);
  cy.contains(ruleName)
    .parents('tr')
    .within(() => {
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getByTestSubj('ruleSwitch').click();
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'false');
      cy.getByTestSubj('ruleSwitch').click();
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    });
};

export const filterOutEndpoints = (endpointHostname: string): void => {
  cy.getByTestSubj('filters-global-container').within(() => {
    cy.getByTestSubj('queryInput').click().type(`host.hostname : "${endpointHostname}"`);
    cy.getByTestSubj('querySubmitButton').click();
  });
};

export const createAgentPolicyTask = (
  version: string
): Cypress.Chainable<IndexedFleetEndpointPolicyResponse> => {
  const policyName = `Reassign ${Math.random().toString(36).substring(2, 7)}`;

  return cy.task<IndexedFleetEndpointPolicyResponse>('indexFleetEndpointPolicy', {
    policyName,
    endpointPackageVersion: version,
    agentPolicyName: policyName,
  });
};

export const filterOutIsolatedHosts = (): void => {
  cy.getByTestSubj('adminSearchBar').click().type('united.endpoint.Endpoint.state.isolation: true');
  cy.getByTestSubj('querySubmitButton').click();
};

const checkEndpointListForIsolatedHosts = (expectIsolated: boolean): void => {
  const chainer = expectIsolated ? 'contain.text' : 'not.contain.text';
  cy.getByTestSubj('endpointListTable').within(() => {
    cy.get('tbody tr').each(($tr) => {
      cy.wrap($tr).within(() => {
        cy.get('td').eq(1).should(chainer, 'Isolated');
      });
    });
  });
};

export const checkEndpointListForOnlyUnIsolatedHosts = (): void =>
  checkEndpointListForIsolatedHosts(false);
export const checkEndpointListForOnlyIsolatedHosts = (): void =>
  checkEndpointListForIsolatedHosts(true);
