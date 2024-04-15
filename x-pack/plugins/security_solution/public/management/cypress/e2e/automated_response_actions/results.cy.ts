/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateToAlertsList } from '../../screens/alerts';
import { generateRandomStringName } from '../../tasks/utils';
import { closeAllToasts } from '../../tasks/toasts';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';

import { login, ROLE } from '../../tasks/login';

// FLAKY: https://github.com/elastic/kibana/issues/171665
describe.skip('Results', { tags: ['@ess', '@serverless'] }, () => {
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
      login(ROLE.soc_manager);
    });

    it('see endpoint action', () => {
      navigateToAlertsList(`query=(language:kuery,query:'_id: ${alertData?.alerts[0]._id}')`);
      closeAllToasts();
      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('securitySolutionFlyoutNavigationExpandDetailButton').click();
      cy.getByTestSubj('securitySolutionFlyoutResponseTab').click();
      cy.contains(/isolate is pending|isolate completed successfully/g);
    });
  });
  describe('do not see results results when does not have RBAC', () => {
    before(() => {
      login(ROLE.t1_analyst);
    });

    it('show the permission denied callout', () => {
      navigateToAlertsList(`query=(language:kuery,query:'_id: ${alertData?.alerts[0]._id}')`);
      closeAllToasts();

      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('securitySolutionFlyoutNavigationExpandDetailButton').click();
      cy.getByTestSubj('securitySolutionFlyoutResponseTab').click();
      cy.contains('Permission denied');
      cy.contains(
        'To access these results, ask your administrator for Elastic Defend Kibana privileges.'
      );
    });
  });
});
