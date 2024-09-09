/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openAlertDetailsView } from '../../screens/alerts';
import { getEndpointListPath } from '../../../common/routing';
import {
  checkEndpointIsIsolated,
  checkFlyoutEndpointIsolation,
  filterOutIsolatedHosts,
  interceptActionRequests,
  isolateHostWithComment,
  openCaseAlertDetails,
  releaseHostWithComment,
  sendActionResponse,
  waitForReleaseOption,
} from '../../tasks/isolate';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { closeAllToasts } from '../../tasks/toasts';
import type { ReturnTypeFromChainable } from '../../types';
import { addAlertsToCase } from '../../tasks/add_alerts_to_case';
import { APP_ALERTS_PATH, APP_CASES_PATH, APP_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import { indexNewCase } from '../../tasks/index_new_case';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';

describe('Isolate command', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  describe('from Manage', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let isolatedEndpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let isolatedEndpointHostnames: [string, string];
    let endpointHostnames: [string, string];

    before(() => {
      indexEndpointHosts({
        count: 2,
        withResponseActions: false,
        isolation: false,
      }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
        endpointHostnames = [
          endpointData.data.hosts[0].host.name,
          endpointData.data.hosts[1].host.name,
        ];
      });

      indexEndpointHosts({
        count: 2,
        withResponseActions: false,
        isolation: true,
      }).then((indexEndpoints) => {
        isolatedEndpointData = indexEndpoints;
        isolatedEndpointHostnames = [
          isolatedEndpointData.data.hosts[0].host.name,
          isolatedEndpointData.data.hosts[1].host.name,
        ];
      });
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        endpointData = undefined;
      }

      if (isolatedEndpointData) {
        isolatedEndpointData.cleanup();
        isolatedEndpointData = undefined;
      }
    });

    beforeEach(() => {
      login();
    });

    it('should allow filtering endpoint by Isolated status', () => {
      loadPage(APP_PATH + getEndpointListPath({ name: 'endpointList' }));
      closeAllToasts();
      filterOutIsolatedHosts();
      isolatedEndpointHostnames.forEach(checkEndpointIsIsolated);
      endpointHostnames.forEach((hostname) => {
        cy.contains(hostname).should('not.exist');
      });
    });
  });

  describe.skip(
    'from Alerts',
    {
      tags: ['@brokenInServerless'],
    },
    () => {
      let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
      let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts> | undefined;
      let hostname: string;

      before(() => {
        indexEndpointHosts({ withResponseActions: false, isolation: false }).then(
          (indexEndpoints) => {
            endpointData = indexEndpoints;
            hostname = endpointData.data.hosts[0].host.name;

            return indexEndpointRuleAlerts({
              endpointAgentId: endpointData.data.hosts[0].agent.id,
              endpointHostname: endpointData.data.hosts[0].host.name,
              endpointIsolated: false,
            });
          }
        );
      });

      after(() => {
        if (endpointData) {
          endpointData.cleanup();
          endpointData = undefined;
        }

        if (alertData) {
          alertData.cleanup();
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

        loadPage(APP_ALERTS_PATH);
        closeAllToasts();

        cy.getByTestSubj('alertsTable').within(() => {
          cy.getByTestSubj('expand-event')
            .first()
            .within(() => {
              cy.get(`[data-is-loading="true"]`).should('exist');
            });
          cy.getByTestSubj('expand-event')
            .first()
            .within(() => {
              cy.get(`[data-is-loading="true"]`).should('not.exist');
            });
        });

        openAlertDetailsView();

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
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000);
        openAlertDetailsView();

        checkFlyoutEndpointIsolation();

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
        openAlertDetailsView();
        cy.getByTestSubj('event-field-agent.status').within(() => {
          cy.get('[title="Isolated"]').should('not.exist');
        });
      });
    }
  );

  // TODO re-enable when https://github.com/elastic/security-team/issues/9625 is merged
  describe.skip('from Cases', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let caseData: ReturnTypeFromChainable<typeof indexNewCase> | undefined;
    let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts> | undefined;
    let caseAlertActions: ReturnType<typeof addAlertsToCase>;
    let alertId: string;
    let caseUrlPath: string;
    let hostname: string;

    before(() => {
      indexNewCase().then((indexCase) => {
        caseData = indexCase;
        caseUrlPath = `${APP_CASES_PATH}/${indexCase.data.id}`;
      });

      indexEndpointHosts({ withResponseActions: false, isolation: false })
        .then((indexEndpoints) => {
          endpointData = indexEndpoints;
          hostname = endpointData.data.hosts[0].host.name;

          return indexEndpointRuleAlerts({
            endpointAgentId: endpointData.data.hosts[0].agent.id,
            endpointHostname: endpointData.data.hosts[0].host.name,
            endpointIsolated: false,
          });
        })
        .then((indexedAlert) => {
          alertData = indexedAlert;
          alertId = alertData.alerts[0]._id;

          if (caseData) {
            caseAlertActions = addAlertsToCase({
              caseId: caseData.data.id,
              alertIds: [alertId],
            });
          }
        });
    });

    after(() => {
      if (caseData) {
        caseData.cleanup();
        caseData = undefined;
      }

      if (endpointData) {
        endpointData.cleanup();
        endpointData = undefined;
      }

      if (alertData) {
        alertData.cleanup();
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

      loadPage(caseUrlPath);
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

      cy.getByTestSubj('user-actions-list').within(() => {
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
          cy.getByTestSubj('securitySolutionFlyoutFooterDropdownButton').click();
        }
        cy.get('[title="Isolated"]').should('not.exist');
      });
    });
  });
});
