/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  FLYOUT_CLOSE_BTN_SEL,
} from '../screens/integrations';

import { AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX, EXISTING_HOSTS_TAB } from '../screens/fleet';
import { TOAST_CLOSE_BTN, CONFIRM_MODAL } from '../screens/navigation';

export const addIntegration = ({ useExistingPolicy } = { useExistingPolicy: false }) => {
  cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
  if (useExistingPolicy) {
    cy.getBySel(EXISTING_HOSTS_TAB).click();
  } else {
    // speeding up creating with unchecking system and agent integration
    cy.getBySel(AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX).uncheck({ force: true });
    cy.get('.euiAccordion__button').click();

    cy.get('*[id^="logs_"]').uncheck({
      force: true,
    });
    cy.get('*[id^="metrics_"]').uncheck({
      force: true,
    });
  }
  cy.getBySel(TOAST_CLOSE_BTN).click();
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // sometimes agent is assigned to default policy, sometimes not
  cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

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

export const deleteIntegrations = async () => {
  const ids: string[] = [];
  cy.request('/api/fleet/package_policies').then((response: any) => {
    response.body.items.forEach((policy: any) => ids.push(policy.id));
    cy.request({
      url: `/api/fleet/package_policies/delete`,
      headers: { 'kbn-xsrf': 'cypress' },
      body: `{ "packagePolicyIds": ${JSON.stringify(ids)}, "force": true }`,
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
