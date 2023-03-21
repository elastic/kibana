/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Interception } from 'cypress/types/net-stubbing';

import { CONFIRM_MODAL } from '../screens/navigation';
import { SETTINGS } from '../screens/integrations';

describe('Install unverified package assets', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/fleet/epm/packages/fleet_server/*', (req) => {
      if (!req.body.force) {
        return req.reply({
          statusCode: 400,
          body: {
            message: 'Package is not verified.',
            attributes: {
              type: 'verification_failed',
            },
          },
        });
      }

      req.reply({
        items: [
          { id: 'fleet_server-1234', type: 'dashboard' },
          { id: 'fleet_server-5678', type: 'dashboard' },
        ],
        _meta: { install_source: 'registry' },
      });
    }).as('installAssets');

    // save mocking out the whole package response, but make it so that fleet server is always uninstalled
    cy.intercept('GET', '/api/fleet/epm/packages/fleet_server*', (req) => {
      req.continue((res) => {
        if (res.body?.item?.savedObject) {
          delete res.body.item.savedObject;
        }
        if (res.body?.item?.status) {
          res.body.item.status = 'not_installed';
        }
      });
    });
  });

  it('should show force install modal if package is unverified', () => {
    cy.visit('app/integrations/detail/fleet_server/settings');
    cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).click();
    // this action will install x assets modal
    const confirmInstall = cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON);
    confirmInstall.click();

    // unverified integration force install modal
    const installAnyway = cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).contains('Install anyway');
    installAnyway.click();

    // cypress 'hack' to get all requests made to an intercepted request
    cy.get('@installAssets.all').then((interceptions) => {
      const castInterceptions = interceptions as unknown as Interception[];
      // expect latest request to have used force
      expect(castInterceptions.at(-1)?.request?.body?.force).to.equal(true);
    });
  });
});
