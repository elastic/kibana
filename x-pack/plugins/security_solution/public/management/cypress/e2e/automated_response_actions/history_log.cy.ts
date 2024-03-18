/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateRandomStringName } from '../../tasks/utils';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointRuleAlerts } from '../../tasks/index_endpoint_rule_alerts';

import { login, ROLE } from '../../tasks/login';

describe(
  'Response actions history page',
  {
    tags: [
      '@ess',
      '@serverless',
      // Not supported in serverless! Currently using a custom role that is not available in serverless
      '@brokenInServerless',
    ],
  },
  () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let endpointDataWithAutomated: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let alertData: ReturnTypeFromChainable<typeof indexEndpointRuleAlerts> | undefined;
    const [endpointAgentId, endpointHostname] = generateRandomStringName(2);

    before(() => {
      indexEndpointHosts({ numResponseActions: 2 }).then((indexEndpoints) => {
        endpointData = indexEndpoints;
      });
      indexEndpointRuleAlerts({
        endpointAgentId,
        endpointHostname,
        endpointIsolated: false,
      }).then((indexedAlert) => {
        alertData = indexedAlert;
        const alertId = alertData.alerts[0]._id;
        return indexEndpointHosts({
          numResponseActions: 1,
          alertIds: [alertId],
        }).then((indexEndpoints) => {
          endpointDataWithAutomated = indexEndpoints;
        });
      });
    });

    after(() => {
      if (endpointDataWithAutomated) {
        endpointDataWithAutomated.cleanup();
        endpointDataWithAutomated = undefined;
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
      login(ROLE.endpoint_response_actions_access);
    });

    it('enable filtering by type', () => {
      cy.visit(`/app/security/administration/response_actions_history`);

      let maxLength: number;
      cy.getByTestSubj('response-actions-list').then(($table) => {
        maxLength = $table.find('tbody .euiTableRow').length;
        cy.get('tbody .euiTableRow').should('have.lengthOf', maxLength);
      });

      cy.getByTestSubj('response-actions-list-types-filter-popoverButton').click();
      cy.getByTestSubj('types-filter-option').contains('Triggered by rule').click();
      cy.getByTestSubj('response-actions-list').within(() => {
        cy.get('tbody .euiTableRow').should('have.lengthOf', 1);
        cy.get('tbody .euiTableRow').eq(0).contains('Triggered by rule');
      });
      cy.getByTestSubj('types-filter-option').contains('Triggered by rule').click();
      cy.getByTestSubj('response-actions-list').within(() => {
        cy.get('tbody .euiTableRow').should('have.lengthOf', maxLength);
      });
      cy.getByTestSubj('types-filter-option').contains('Triggered manually').click();
      cy.getByTestSubj('response-actions-list').within(() => {
        cy.get('tbody .euiTableRow').should('have.lengthOf', maxLength - 1);
      });
      cy.getByTestSubj('types-filter-option').contains('Triggered by rule').click();
      cy.getByTestSubj('response-actions-list').within(() => {
        cy.get('tbody .euiTableRow').should('have.lengthOf', maxLength);
        cy.get('tbody .euiTableRow').eq(0).contains('Triggered by rule').click();
      });
      // check if we were moved to Rules app after clicking Triggered by rule
      cy.getByTestSubj('breadcrumb last').contains('Detection rules (SIEM)');
    });
  }
);
