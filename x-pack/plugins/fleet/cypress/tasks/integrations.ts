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
  FLYOUT_CLOSE_BTN_SEL,
  INTEGRATION_NAME_LINK,
} from '../screens/integrations';

export const addIntegration = () => {
  cy.getBySel(ADD_POLICY_BTN).click();
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // sometimes agent is assigned to default policy, sometimes not
  cy.getBySel(CONFIRM_MODAL_BTN).click();

  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).should('not.exist');
  clickIfVisible(FLYOUT_CLOSE_BTN_SEL);
};

export function clickIfVisible(selector: string) {
  cy.get('body').then(($body) => {
    if ($body.find(selector).length) {
      cy.get(selector).click();
    }
  });
}

export const deleteIntegrations = async (integration: string) => {
  const ids: string[] = [];
  cy.getBySel(INTEGRATION_NAME_LINK)
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
    url: `/api/fleet/epm/packages/${integration}/${version}`,
    headers: { 'kbn-xsrf': 'cypress' },
    body: '{ "force": true }',
    method: 'POST',
  });
};
