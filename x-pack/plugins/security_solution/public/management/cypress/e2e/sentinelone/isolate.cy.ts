/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { openAlertDetailsView } from '../../screens/alerts';
import { closeAllToasts } from '../../tasks/toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { ROLE, login } from '../../tasks/login';
import { disableExpandableFlyoutAdvancedSettings } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/alerts';

describe.skip(
  'Isolate command',
  {
    tags: [
      '@ess',
      '@serverless',

      // Not supported in serverless!
      // The `disableExpandableFlyoutAdvancedSettings()` fails because the API
      // `internal/kibana/settings` is not accessible in serverless
      '@brokenInServerless',
    ],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'sentinelOneManualHostActionsEnabled',
          ])}`,
          `--xpack.stack_connectors.enableExperimental=${JSON.stringify([
            'sentinelOneConnectorOn',
          ])}`,
          `--xpack.actions.preconfigured=${JSON.stringify({
            'preconfigured-sentinelone': {
              name: 'preconfigured-sentinelone',
              actionTypeId: '.sentinelone',
              config: {
                url: process.env.CYPRESS_SENTINELONE_URL,
              },
              secrets: {
                token: process.env.CYPRESS_SENTINELONE_TOKEN,
              },
            },
          })}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.dataSession(
        'SENTINELONE_HOST', // data name
        () => cy.task('createSentinelOneHost', {}, { timeout: 1000000 }),
        () => true
      );
      cy.dataSession('SENTINELONE_POLICY', () => cy.task('createSentinelOneAgentPolicy'), true);
    });

    after(() => {
      cy.dataSession('SENTINELONE_HOST').then((createdHost) => {
        if (createdHost && !Cypress.env('isInteractive')) {
          createdHost.destroy();
        }
      });
      cy.dataSession('SENTINELONE_POLICY').then((agentPolicy) => {
        if (agentPolicy) {
          agentPolicy.stop();
          cy.task('deleteFleetServerPolicy', agentPolicy.policyId);
        }
      });
    });

    beforeEach(() => {
      login(ROLE.soc_manager);
      disableExpandableFlyoutAdvancedSettings();
    });

    describe('From alerts', () => {
      let ruleId: string;
      let ruleName: string;

      before(() => {
        cy.dataSession('SENTINELONE_HOST').then((createdHost) =>
          loadRule(
            {
              index: ['logs-sentinel_one.alert*'],
              query: `host.name: ${createdHost.name} and observer.serial_number:*`,
              from: 'now-3660s',
            },
            false
          ).then((data) => {
            ruleId = data.id;
            ruleName = data.name;
          })
        );
      });

      after(() => {
        if (ruleId) {
          cleanupRule(ruleId);
        }
      });

      it('should isolate and release host', () => {
        toggleRuleOffAndOn(ruleName);
        visitRuleAlerts(ruleName);
        waitForAlertsToPopulate(1, 10000, 600000);

        closeAllToasts();
        openAlertDetailsView();

        cy.getByTestSubj('isolate-host-action-item').click();
        cy.getByTestSubj('hostIsolateConfirmButton').click();
        cy.dataSession('SENTINELONE_HOST').then((createdHost) => {
          cy.log('create', createdHost);
          cy.getByTestSubj('hostIsolateSuccessMessage').should(
            'contain.text',
            `Isolation on host ${createdHost.name} successfully submitted`
          );
        });

        cy.getByTestSubj('euiFlyoutCloseButton').click();

        recurse<string>(
          () => {
            openAlertDetailsView();
            return cy.getByTestSubj('isolate-host-action-item').invoke('text');
          },
          (text) => text === 'Release host',
          {
            log: true,
            delay: 30000,
            timeout: 600000,
            post: () => cy.getByTestSubj('euiFlyoutCloseButton').click(),
          }
        );

        cy.getByTestSubj('isolate-host-action-item').should('contain.text', 'Release host', {
          timeout: 120000,
        });
        cy.getByTestSubj('isolate-host-action-item').click();

        cy.contains('Confirm').click();
        cy.dataSession('SENTINELONE_HOST').then((createdHost) => {
          cy.getByTestSubj('hostUnisolateSuccessMessage').should(
            'contain.text',
            `Release on host ${createdHost.name} successfully submitted`
          );
        });
      });
    });
  }
);
