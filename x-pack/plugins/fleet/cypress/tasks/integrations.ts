/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_POLICY_BTN,
  CONFIRM_MODAL_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  INTEGRATION_NAME_LINK,
  SETTINGS_TAB,
} from '../screens/integrations';

export const addIntegration = () => {
  cy.get(ADD_POLICY_BTN).click();
  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // sometimes agent is assigned to default policy, sometimes not
  closeModalIfVisible();

  cy.get(CREATE_PACKAGE_POLICY_SAVE_BTN).should('not.exist');
};

function closeModalIfVisible() {
  cy.get('body').then(($body) => {
    if ($body.find(CONFIRM_MODAL_BTN).length) {
      cy.get(CONFIRM_MODAL_BTN).click();
    }
  });
}

export const deleteIntegrations = async (integration: string) => {
  const ids = [];
  cy.get(INTEGRATION_NAME_LINK)
    .each(($a) => {
      const href = $a.attr('href') as string;
      ids.push(href.substr(href.lastIndexOf('/') + 1));
    })
    .then(() => {
      cy.request({
        url: `/api/fleet/package_policies/delete`,
        headers: { 'kbn-xsrf': 'cypress' },
        body: `{ "packagePolicyIds": ${JSON.stringify(ids)} }`,
        method: 'POST',
      });
    });
};

export const installPackageWithVersion = (integration: string, version: string) => {
  cy.request({
    url: `/api/fleet/epm/packages/${integration}-${version}`,
    headers: { 'kbn-xsrf': 'cypress' },
    body: '{ "force": true }',
    method: 'POST',
  });
};
