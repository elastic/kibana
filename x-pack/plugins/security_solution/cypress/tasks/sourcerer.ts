/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HOSTS_STAT, SOURCERER } from '../screens/sourcerer';
import { TIMELINE_TITLE } from '../screens/timeline';
import { HOSTS_URL } from '../urls/navigation';
import { waitForPage } from './login';
import { openTimelineUsingToggle } from './security_main';
import { DEFAULT_ALERTS_INDEX } from '../../common/constants';
import { createCustomRuleEnabled } from './api_calls/rules';
import { getNewRule } from '../objects/rule';

export const openSourcerer = (sourcererScope?: string) => {
  if (sourcererScope != null && sourcererScope === 'timeline') {
    return openTimelineSourcerer();
  }
  cy.get(SOURCERER.trigger).should('be.enabled');
  cy.get(SOURCERER.trigger).should('be.visible');
  cy.get(SOURCERER.trigger).click();
  cy.get(SOURCERER.wrapper).should('be.visible');
};
export const openTimelineSourcerer = () => {
  cy.get(SOURCERER.triggerTimeline).should('be.enabled');
  cy.get(SOURCERER.triggerTimeline).should('be.visible');
  cy.get(SOURCERER.triggerTimeline).first().click();
  cy.get(SOURCERER.wrapperTimeline).should('be.visible');
};
export const openAdvancedSettings = () => {
  cy.get(SOURCERER.advancedSettings).should('be.visible');
  cy.get(SOURCERER.advancedSettings).click();
};

export const clickOutOfSelector = () => {
  return cy.get(SOURCERER.popoverTitle).first().click();
};

export const isDataViewSelection = (dataView: string) => {
  return cy.get(SOURCERER.selectActiveOption).should('contain', dataView);
};

export const openDataViewSelection = () => cy.get(SOURCERER.selectActiveOption).click();
export const isKibanaDataViewOption = (dataViews: string[]) => {
  return dataViews.every((dataView) => {
    return cy.get(SOURCERER.selectListOption).should(`contain`, dataView);
  });
};

export const isSourcererSelection = (patternName: string) => {
  return cy.get(SOURCERER.comboBoxInput).find(`span[title="${patternName}"]`).should('exist');
};

export const isHostsStatValue = (value: string) => {
  return cy.get(HOSTS_STAT).first().should('have.text', value);
};

export const isNotSourcererSelection = (patternName: string) => {
  return cy.get(SOURCERER.comboBoxInput).find(`span[title="${patternName}"]`).should('not.exist');
};
export const isNotSourcererOption = (patternName: string) => {
  return cy
    .get(SOURCERER.comboBoxOptions)
    .find(`button[title="${patternName}"]`)
    .should('not.exist');
};

export const isSourcererOptions = (patternNames: string[]) => {
  cy.get(SOURCERER.comboBoxInput).click();
  return patternNames.every((patternName) => {
    return cy.get(SOURCERER.comboBoxOptions).should(`contain`, patternName);
  });
};

export const selectSourcererOption = (patternName: string) => {
  cy.get(SOURCERER.comboBoxInput).click();
  cy.get(SOURCERER.comboBoxOptions)
    .find(`button.euiFilterSelectItem[title="${patternName}"]`)
    .click();
  clickOutOfSelector();
  return cy.get(SOURCERER.saveButton).click({ force: true });
};

export const deselectSourcererOption = (patternName: string) => {
  cy.get(SOURCERER.comboBoxInput).find(`span[title="${patternName}"] button`).click();
  clickOutOfSelector();
  return cy.get(SOURCERER.saveButton).click({ force: true });
};

export const deselectSourcererOptions = (patternNames: string[]) => {
  patternNames.forEach((patternName) =>
    cy.get(SOURCERER.comboBoxInput).find(`span[title="${patternName}"] button`).click()
  );
};

export const saveSourcerer = () => {
  clickOutOfSelector();
  return cy.get(SOURCERER.saveButton).click({ force: true });
};

export const resetSourcerer = () => {
  return cy.get(SOURCERER.resetButton).click();
};

export const setSourcererOption = (patternName: string, sourcererScope?: string) => {
  openSourcerer(sourcererScope);
  isNotSourcererSelection(patternName);
  selectSourcererOption(patternName);
};

export const unsetSourcererOption = (patternName: string, sourcererScope?: string) => {
  openSourcerer(sourcererScope);
  isSourcererSelection(patternName);
  deselectSourcererOption(patternName);
};

export const clickOutOfSourcererTimeline = () => cy.get(TIMELINE_TITLE).first().click();

export const clickAlertCheckbox = () => cy.get(SOURCERER.alertCheckbox).check({ force: true });

export const addIndexToDefault = (index: string) => {
  cy.visit(`/app/management/kibana/settings?query=category:(securitySolution)`);
  cy.get(SOURCERER.siemDefaultIndexInput)
    .invoke('val')
    .then((patterns) => {
      cy.get(SOURCERER.siemDefaultIndexInput).type(`${patterns},${index}`);
      cy.get('body').then(($body) => {
        if ($body.find('[data-test-subj="toastCloseButton]"').length > 0) {
          cy.get('[data-test-subj="toastCloseButton]"').click();
        }
      });
      cy.get('button[data-test-subj="advancedSetting-saveButton"]').click();
      cy.get('.euiToast .euiButton--primary').click();
      waitForPage(HOSTS_URL);
    });
};

export const deleteAlertsIndex = () => {
  const alertsIndexUrl = `${Cypress.env(
    'ELASTICSEARCH_URL'
  )}/.internal.alerts-security.alerts-default-000001`;

  cy.request({
    url: alertsIndexUrl,
    method: 'GET',
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200) {
      cy.request({
        url: alertsIndexUrl,
        method: 'DELETE',
        headers: { 'kbn-xsrf': 'cypress-creds' },
      });
    }
  });
};

export const refreshUntilAlertsIndexExists = async () => {
  cy.waitUntil(
    () => {
      cy.reload();
      openTimelineUsingToggle();
      openSourcerer('timeline');
      openAdvancedSettings();

      return cy
        .get(SOURCERER.comboBoxInput)
        .invoke('text')
        .then((txt) => txt.includes(`${DEFAULT_ALERTS_INDEX}-default`));
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForAlertsIndexToExist = () => {
  createCustomRuleEnabled(getNewRule(), '1', '100m', 100);
  refreshUntilAlertsIndexExists();
};
