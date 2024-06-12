/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openAlertDetailsView } from '../../screens/alerts';
import { closeAllToasts } from '../../tasks/toasts';
import { ROLE, login } from '../../tasks/login';
import { indexCrowdstrikeRuleAlerts } from '../../tasks/index_crowdstrike_rule_alerts';
import { disableExpandableFlyoutAdvancedSettings, loadPage } from '../../tasks/common';
// TODO TC: This test is responsible for ingesting Crowdstrike event and in the future will be responsible for isolating the host
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
            'responseActionsCrowdstrikeManualHostIsolationEnabled',
          ])}`,
          `--xpack.stack_connectors.enableExperimental=${JSON.stringify([
            'crowdstrikeConnectorOn',
          ])}`,
          `--xpack.actions.preconfigured=${JSON.stringify({
            'preconfigured-crowdstrike': {
              name: 'preconfigured-crowdstrike',
              actionTypeId: '.crowdstrike',
              config: {},
              secrets: {
                clientId: process.env.CYPRESS_CROWDSTRIKE_CLIENT_ID,
                clientSecret: process.env.CYPRESS_CROWDSTRIKE_CLIENT_SECRET,
              },
            },
          })}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login(ROLE.soc_manager);
      disableExpandableFlyoutAdvancedSettings();
    });

    describe('From alerts', () => {
      before(() => {
        indexCrowdstrikeRuleAlerts({ count: 2 });
      });

      it('should isolate and release host', () => {
        loadPage('/app/security/alerts');

        closeAllToasts();
        openAlertDetailsView();

        cy.getByTestSubj('isolate-host-action-item').click();
        cy.getByTestSubj('hostIsolateConfirmButton').click();

        cy.getByTestSubj('euiFlyoutCloseButton').click();
      });
    });
  }
);
