/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../common/endpoint/types';

export const interceptActionRequests = (
  cb: (responseBody: ActionDetails) => void,
  alias: string
) => {
  cy.intercept('POST', '/api/endpoint/action/*', (req) => {
    req.continue((res) => {
      const {
        body: { action, data },
      } = res;

      cb({ action, ...data });
    });
  }).as(alias);
};

export const sendActionResponse = (action: ActionDetails) => {
  cy.task('sendHostActionResponse', {
    action,
    state: { state: 'success' },
  });
};

export const isolateHostWithComment = (comment: string, hostname: string) => {
  cy.getByTestSubj('isolate-host-action-item').click();
  cy.contains(`Isolate host ${hostname} from network.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const releaseHostWithComment = (comment: string, hostname: string) => {
  cy.contains(`${hostname} is currently isolated.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const openAlertDetails = () => {
  cy.getByTestSubj('expand-event').click();
  cy.getByTestSubj('take-action-dropdown-btn').click();
};

export const openCaseAlertDetails = (alertId: string) => {
  cy.getByTestSubj(`comment-action-show-alert-${alertId}`).click();
  cy.getByTestSubj('take-action-dropdown-btn').click();
};
export const waitForReleaseOption = (alertId: string) => {
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
