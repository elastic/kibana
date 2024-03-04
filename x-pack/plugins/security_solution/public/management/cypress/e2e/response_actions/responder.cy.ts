/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from '../../tasks/toasts';
import type { ReturnTypeFromChainable } from '../../types';
import { addAlertsToCase } from '../../tasks/add_alerts_to_case';
import { APP_CASES_PATH } from '../../../../../common/constants';
import {
  closeResponder,
  closeResponderActionLogFlyout,
  openResponderActionLogFlyout,
  setResponderActionLogDateRange,
} from '../../screens/responder';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import { indexNewCase } from '../../tasks/index_new_case';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';

describe('When accessing Endpoint Response Console', { tags: ['@ess', '@serverless'] }, () => {
  const performResponderSanityChecks = () => {
    openResponderActionLogFlyout();
    // Ensure the popover in the action log date quick select picker is accessible
    // (this is especially important for when Responder is displayed from a Timeline)
    setResponderActionLogDateRange();
    closeResponderActionLogFlyout();

    // Global kibana nav bar should remain accessible
    // (the login user button seems to be common in both ESS and serverless)
    cy.getByTestSubj('userMenuButton').should('be.visible');

    closeResponder();
  };

  before(() => {
    login();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/169894
  describe.skip('from Cases', () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;
    let caseData: ReturnTypeFromChainable<typeof indexNewCase>;
    let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts>;
    let caseAlertActions: ReturnType<typeof addAlertsToCase>;
    let alertId: string;
    let caseUrlPath: string;

    const openCaseAlertDetails = () => {
      cy.getByTestSubj(`comment-action-show-alert-${caseAlertActions.comments[alertId]}`).click();
      cy.getByTestSubj('take-action-dropdown-btn').click();
    };

    before(() => {
      indexNewCase().then((indexCase) => {
        caseData = indexCase;
        caseUrlPath = `${APP_CASES_PATH}/${indexCase.data.id}`;
      });

      indexEndpointHosts()
        .then((indexEndpoints) => {
          endpointData = indexEndpoints;
        })
        .then(() => {
          return indexEndpointRuleAlerts({
            endpointAgentId: endpointData.data.hosts[0].agent.id,
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

    it('should display responder option in take action menu', () => {
      loadPage(caseUrlPath);
      closeAllToasts();
      openCaseAlertDetails();
      cy.getByTestSubj('endpointResponseActions-action-item').should('be.enabled');
    });

    it('should display Responder response action interface', () => {
      loadPage(caseUrlPath);
      closeAllToasts();
      openCaseAlertDetails();
      cy.getByTestSubj('endpointResponseActions-action-item').click();
      performResponderSanityChecks();
    });
  });
});
