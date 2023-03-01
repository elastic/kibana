/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_POLICY } from '../screens/fleet';
import {
  ADD_POLICY_BTN,
  CONFIRM_MODAL_BTN,
  CONFIRM_MODAL_BTN_SEL,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  DATA_COLLECTION_SETUP_STEP,
  TOAST_CLOSE_BTN,
  TOAST_CLOSE_BTN_SEL,
} from '../screens/integrations';

export const addIntegration = (agentPolicy = DEFAULT_POLICY) => {
  cy.getBySel(ADD_POLICY_BTN).click();
  cy.getBySel(DATA_COLLECTION_SETUP_STEP).find('.euiLoadingSpinner').should('not.exist');
  cy.contains('Existing hosts').click();
  cy.getBySel('agentPolicySelect').click();
  cy.contains(agentPolicy).click();
  cy.getBySel('agentPolicySelect').should('have.text', agentPolicy);
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // sometimes agent is assigned to default policy, sometimes not
  closeModalIfVisible();
};

export function closeModalIfVisible() {
  cy.get('body').then(($body) => {
    if ($body.find(CONFIRM_MODAL_BTN_SEL).length) {
      cy.getBySel(CONFIRM_MODAL_BTN).click();
    }
  });
}

export function closeToastIfVisible() {
  cy.get('body').then(($body) => {
    const button = $body.find(TOAST_CLOSE_BTN_SEL);
    if (button.length) {
      if (button.length > 1) {
        cy.getBySel(TOAST_CLOSE_BTN).click({ multiple: true, force: true });
      } else {
        cy.getBySel(TOAST_CLOSE_BTN).click();
      }
    }
  });
}

export const deleteIntegrations = async (integrationName: string) => {
  const ids: string[] = [];
  cy.contains(integrationName)
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
