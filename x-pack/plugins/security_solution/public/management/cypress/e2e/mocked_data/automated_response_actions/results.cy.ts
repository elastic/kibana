/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { disableExpandableFlyoutAdvancedSettings } from '../../../tasks/common';
import { generateRandomStringName } from '../../../tasks/utils';
import { APP_ALERTS_PATH } from '../../../../../../common/constants';
import { closeAllToasts } from '../../../tasks/toasts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../../types';
import { indexEndpointRuleAlerts } from '../../../tasks/index_endpoint_rule_alerts';

import { login, ROLE } from '../../../tasks/login';

describe('Results', () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
  let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts> | undefined;
  const [endpointAgentId, endpointHostname] = generateRandomStringName(2);

  before(() => {
    indexEndpointRuleAlerts({
      endpointAgentId,
      endpointHostname,
      endpointIsolated: false,
    }).then((indexedAlert) => {
      alertData = indexedAlert;
      const alertId = alertData.alerts[0]._id;
      return indexEndpointHosts({
        withResponseActions: true,
        numResponseActions: 1,
        alertIds: [alertId],
      }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
      });
    });
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

  describe('see results when has RBAC', () => {
    before(() => {
      login(ROLE.endpoint_response_actions_access);
      disableExpandableFlyoutAdvancedSettings();
    });

    it('see endpoint action', () => {
      cy.visit(APP_ALERTS_PATH);
      closeAllToasts();
      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('response-actions-notification').should('not.have.text', '0');
      cy.getByTestSubj('responseActionsViewTab').click();
      cy.getByTestSubj('endpoint-results-comment');
      cy.contains(/isolate is pending|isolate completed successfully/g);
    });
  });
  describe('do not see results results when does not have RBAC', () => {
    before(() => {
      login(ROLE.endpoint_response_actions_no_access);
      disableExpandableFlyoutAdvancedSettings();
    });

    it('show the permission denied callout', () => {
      cy.visit(APP_ALERTS_PATH);
      closeAllToasts();

      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('response-actions-notification').should('not.have.text', '0');
      cy.getByTestSubj('responseActionsViewTab').click();
      cy.contains('Permission denied');
      cy.contains(
        'To access these results, ask your administrator for Elastic Defend Kibana privileges.'
      );
    });
  });
});
