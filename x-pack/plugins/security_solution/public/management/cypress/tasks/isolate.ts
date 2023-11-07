/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable cypress/no-unnecessary-waiting */

import { openAlertDetailsView } from '../screens/alerts';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { loadPage } from './common';

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

export const isolateHostFromEndpointList = (index: number = 0): void => {
  // open the action menu and click isolate action
  cy.getByTestSubj('endpointTableRowActions').eq(index).click();
  cy.getByTestSubj('isolateLink').click();
  // isolation form, click confirm button
  cy.getByTestSubj('hostIsolateConfirmButton').click();
  // return to endpoint details
  cy.getByTestSubj('hostIsolateSuccessCompleteButton').click();
  // close details flyout
  cy.getByTestSubj('euiFlyoutCloseButton').click();

  // ensure the host is isolated, wait for 3 minutes for the host to be isolated
  cy.wait(18000);

  cy.getByTestSubj('endpointListTable').within(() => {
    cy.get('tbody tr')
      .eq(index)
      .within(() => {
        cy.get('td').eq(1).should('contain.text', 'Isolated');
      });
  });
};

export const releaseHostWithComment = (comment: string, hostname: string): void => {
  cy.contains(`${hostname} is currently isolated.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
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
  loadPage('/app/security/rules');
  cy.contains(ruleName).click();
};

export const checkFlyoutEndpointIsolation = (): void => {
  cy.getByTestSubj('event-field-agent.status').then(($status) => {
    if ($status.find('[title="Isolated"]').length > 0) {
      cy.contains('Release host').click();
    } else {
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.wait(5000);
      openAlertDetailsView();
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.contains('Isolated');
      });
      cy.contains('Release host').click();
    }
  });
};

export const toggleRuleOffAndOn = (ruleName: string): void => {
  loadPage('/app/security/rules');
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
    cy.getByTestSubj('queryInput').click();
    cy.getByTestSubj('queryInput').type(`host.name: ${endpointHostname}`);
    cy.getByTestSubj('querySubmitButton').click();
  });
};

export const filterOutIsolatedHosts = (): void => {
  cy.getByTestSubj('adminSearchBar').type('united.endpoint.Endpoint.state.isolation: true');
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

export const checkEndpointIsolationStatus = (
  endpointHostname: string,
  expectIsolated: boolean
): void => {
  const chainer = expectIsolated ? 'contain.text' : 'not.contain.text';

  cy.contains(endpointHostname).parents('td').siblings('td').eq(0).should(chainer, 'Isolated');
};

export const checkEndpointIsIsolated = (endpointHostname: string): void =>
  checkEndpointIsolationStatus(endpointHostname, true);

export const checkEndpointIsNotIsolated = (endpointHostname: string): void =>
  checkEndpointIsolationStatus(endpointHostname, false);
