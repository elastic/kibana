/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  interceptActionRequests,
  isolateHostWithComment,
  openAlertDetails,
  openCaseAlertDetails,
  releaseHostWithComment,
  sendActionResponse,
  waitForReleaseOption,
} from '../../tasks/isolate';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { closeAllToasts } from '../../tasks/close_all_toasts';
import type { ReturnTypeFromChainable } from '../../types';
import { addAlertsToCase } from '../../tasks/add_alerts_to_case';
import { APP_CASES_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';
import { indexNewCase } from '../../tasks/index_new_case';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';

describe('Isolate command', () => {
  describe('from Manage', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;

    before(() => {
      indexEndpointHosts({
        count: 4,
        disableEndpointActionsForHost: true,
        endpointIsolated: false,
        bothIsolatedAndNormalEndpoints: true,
      }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
      });
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }
    });
    beforeEach(() => {
      login();
    });
    it('should allow filtering endpoint by Isolated status', () => {
      cy.visit('/app/security/administration/endpoints');
      closeAllToasts();
      cy.getByTestSubj('adminSearchBar')
        .click()
        .type('united.endpoint.Endpoint.state.isolation: true {enter}');
      cy.getByTestSubj('endpointListTable').within(() => {
        cy.get('tbody tr').each(($tr) => {
          cy.wrap($tr).within(() => {
            cy.get('td').eq(1).should('contain.text', 'Isolated');
          });
        });
      });
    });
  });

  describe('from Alerts', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts>;
    let alertId: string;
    let hostname: string;

    before(() => {
      indexEndpointHosts({ disableEndpointActionsForHost: true, endpointIsolated: false })
        .then((indexEndpoints) => {
          endpointData = indexEndpoints;
          hostname = endpointData.data.hosts[0].host.name;
        })
        .then(() => {
          return indexEndpointRuleAlerts({
            endpointAgentId: endpointData.data.hosts[0].agent.id,
            endpointHostname: endpointData.data.hosts[0].host.name,
            endpointIsolated: false,
          }).then((indexedAlert) => {
            alertData = indexedAlert;
            alertId = alertData.alerts[0]._id;
          });
        });
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }

      if (alertData) {
        alertData.cleanup();
        // @ts-expect-error ignore setting to undefined
        alertData = undefined;
      }
    });

    beforeEach(() => {
      login();
    });

    it('should isolate and release host', () => {
      const isolateComment = `Isolating ${hostname}`;
      const releaseComment = `Releasing ${hostname}`;
      let isolateRequestResponse: ActionDetails;
      let releaseRequestResponse: ActionDetails;

      cy.visit('/app/security/alerts');
      closeAllToasts();

      cy.getByTestSubj('filters-global-container').within(() => {
        cy.getByTestSubj('queryInput').click().type(`_id:${alertId} {enter}`);
      });
      openAlertDetails();

      isolateHostWithComment(isolateComment, hostname);

      interceptActionRequests((responseBody) => {
        isolateRequestResponse = responseBody;
      }, 'isolate');

      cy.getByTestSubj('hostIsolateConfirmButton').click();

      cy.wait('@isolate').then(() => {
        sendActionResponse(isolateRequestResponse);
      });

      cy.contains(`Isolation on host ${hostname} successfully submitted`);

      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.wait(1000);
      openAlertDetails();
      cy.getByTestSubj('event-field-agent.status').then(($status) => {
        if ($status.find('[title="Isolated"]').length > 0) {
          cy.contains('Release host').click();
        } else {
          cy.getByTestSubj('euiFlyoutCloseButton').click();
          openAlertDetails();
          cy.getByTestSubj('event-field-agent.status').within(() => {
            cy.contains('Isolated');
          });
          cy.contains('Release host').click();
        }
      });

      releaseHostWithComment(releaseComment, hostname);

      interceptActionRequests((responseBody) => {
        releaseRequestResponse = responseBody;
      }, 'release');

      cy.contains('Confirm').click();

      cy.wait('@release').then(() => {
        sendActionResponse(releaseRequestResponse);
      });

      cy.contains(`Release on host ${hostname} successfully submitted`);
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      openAlertDetails();
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.get('[title="Isolated"]').should('not.exist');
      });
    });
  });

  describe('from Cases', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let caseData: ReturnTypeFromChainable<typeof indexNewCase>;
    let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts>;
    let caseAlertActions: ReturnType<typeof addAlertsToCase>;
    let alertId: string;
    let caseUrlPath: string;
    let hostname: string;

    before(() => {
      indexNewCase().then((indexCase) => {
        caseData = indexCase;
        caseUrlPath = `${APP_CASES_PATH}/${indexCase.data.id}`;
      });

      indexEndpointHosts({ disableEndpointActionsForHost: true })
        .then((indexEndpoints) => {
          endpointData = indexEndpoints;
          hostname = endpointData.data.hosts[0].host.name;
        })
        .then(() => {
          return indexEndpointRuleAlerts({
            endpointAgentId: endpointData.data.hosts[0].agent.id,
            endpointHostname: endpointData.data.hosts[0].host.name,
            endpointIsolated: false,
          }).then((indexedAlert) => {
            alertData = indexedAlert;
            alertId = alertData.alerts[0]._id;
          });
        })
        .then(() => {
          caseAlertActions = addAlertsToCase({
            caseId: caseData.data.id,
            alertIds: [alertId],
          });
        });
    });

    after(() => {
      if (caseData) {
        caseData.cleanup();
        // @ts-expect-error ignore setting to undefined
        caseData = undefined;
      }

      if (endpointData) {
        endpointData.cleanup();
        // @ts-expect-error ignore setting to undefined
        endpointData = undefined;
      }

      if (alertData) {
        alertData.cleanup();
        // @ts-expect-error ignore setting to undefined
        alertData = undefined;
      }
    });

    beforeEach(() => {
      login();
    });

    it('should isolate and release host', () => {
      let isolateRequestResponse: ActionDetails;
      let releaseRequestResponse: ActionDetails;
      const isolateComment = `Isolating ${hostname}`;
      const releaseComment = `Releasing ${hostname}`;
      const caseAlertId = caseAlertActions.comments[alertId];

      cy.visit(caseUrlPath);
      closeAllToasts();
      openCaseAlertDetails(caseAlertId);

      isolateHostWithComment(isolateComment, hostname);

      interceptActionRequests((responseBody) => {
        isolateRequestResponse = responseBody;
      }, 'isolate');

      cy.getByTestSubj('hostIsolateConfirmButton').click();

      cy.wait('@isolate').then(() => {
        sendActionResponse(isolateRequestResponse);
      });

      cy.contains(`Isolation on host ${hostname} successfully submitted`);

      cy.getByTestSubj('euiFlyoutCloseButton').click();

      cy.getByTestSubj('user-actions').within(() => {
        cy.contains(isolateComment);
        cy.get('[aria-label="lock"]').should('exist');
        cy.get('[aria-label="lockOpen"]').should('not.exist');
      });

      waitForReleaseOption(caseAlertId);

      releaseHostWithComment(releaseComment, hostname);

      interceptActionRequests((responseBody) => {
        releaseRequestResponse = responseBody;
      }, 'release');

      cy.contains('Confirm').click();

      cy.wait('@release').then(() => {
        sendActionResponse(releaseRequestResponse);
      });

      cy.contains(`Release on host ${hostname} successfully submitted`);
      cy.getByTestSubj('euiFlyoutCloseButton').click();

      cy.getByTestSubj('user-actions').within(() => {
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
