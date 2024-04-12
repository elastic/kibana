/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../common/constants';
import { DEFAULT_POLICY } from '../screens/fleet';
import {
  ADD_POLICY_BTN,
  CONFIRM_MODAL_BTN,
  CONFIRM_MODAL_BTN_SEL,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  DATA_COLLECTION_SETUP_STEP,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_TAB_SEL,
  TOAST_CLOSE_BTN,
  TOAST_CLOSE_BTN_SEL,
} from '../screens/integrations';

export const addIntegration = (agentPolicy = DEFAULT_POLICY) => {
  cy.getBySel(ADD_POLICY_BTN).click();
  cy.getBySel(DATA_COLLECTION_SETUP_STEP).find('.euiLoadingSpinner').should('not.exist');
  cy.contains('Existing hosts').click();
  cy.getBySel('agentPolicySelect').click();
  cy.contains(agentPolicy).click();
  cy.getBySel('agentPolicySelect').should('contain.text', agentPolicy);
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // sometimes agent is assigned to default policy, sometimes not
  closeModalIfVisible();
};

export const addCustomIntegration = (integrationName: string, policyName: string) => {
  cy.getBySel(ADD_POLICY_BTN).click();
  cy.getBySel(DATA_COLLECTION_SETUP_STEP).find('.euiLoadingSpinner').should('not.exist');
  cy.getBySel('packagePolicyNameInput').clear();
  cy.getBySel('packagePolicyNameInput').type(`${integrationName}`);
  cy.getBySel('createAgentPolicyNameField').clear();
  cy.getBySel('createAgentPolicyNameField').type(`${policyName}`);
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();
  // No agent is enrolled with this policy, close "Add agent" modal
  cy.getBySel('confirmModalCancelButton').click();
};

export const policyContainsIntegration = (integrationName: string, policyName: string) => {
  cy.visit('app/fleet/policies');
  cy.contains(policyName).click();
  integrationExistsWithinPolicyDetails(integrationName);
};

export const integrationExistsWithinPolicyDetails = (integrationName: string) => {
  cy.contains('Actions').click();
  cy.contains('View policy').click();
  cy.contains(`name: ${integrationName}`);
};

export const interceptAgentPolicyId = (cb: (policyId: string) => void) => {
  // create policy has agent_policies?SOMEPARAMS=true , this ? helps to distinguish it from the delete agent_policies/delete route
  cy.intercept('POST', '**/api/fleet/agent_policies?**', (req) => {
    req.continue((res) => {
      cb(res.body.item.id);

      return res.send(res.body);
    });
  });
};

export const interceptCaseId = (cb: (caseId: string) => void) => {
  cy.intercept('POST', '**/api/cases', (req) => {
    req.continue((res) => {
      cb(res.body.id);

      return res.send(res.body);
    });
  });
};

export const interceptPackId = (cb: (packId: string) => void) => {
  cy.intercept('POST', '**/api/osquery/packs', (req) => {
    req.continue((res) => {
      if (res.body.data) {
        cb(res.body.data.saved_object_id);
      }

      return res.send(res.body);
    });
  });
};

export const generateRandomStringName = (length: number) =>
  Array.from({ length }, () => Math.random().toString(36).substring(2));

export function closeModalIfVisible() {
  cy.get('body').then(($body) => {
    if ($body.find(CONFIRM_MODAL_BTN_SEL).length) {
      cy.getBySel(CONFIRM_MODAL_BTN).click();
    }
  });
}

export function closeDateTabIfVisible() {
  cy.get('body').then(($body) => {
    if ($body.find(DATE_PICKER_ABSOLUTE_TAB_SEL).length) {
      cy.getBySel(DATE_PICKER_ABSOLUTE_TAB).clickOutside();
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
        headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': API_VERSIONS.public.v1 },
        body: `{ "packagePolicyIds": ${JSON.stringify(ids)} }`,
        method: 'POST',
      });
    });
};

export const installPackageWithVersion = (integration: string, version: string) => {
  cy.request({
    url: `/api/fleet/epm/packages/${integration}-${version}`,
    headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    body: '{ "force": true }',
    method: 'POST',
  });
};
