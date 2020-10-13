/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HOSTS_STAT,
  SOURCERER_INPUT,
  SOURCERER_OPTIONS,
  SOURCERER_POPOVER_TITLE,
  SOURCERER_RESET_BUTTON,
  SOURCERER_SAVE_BUTTON,
  SOURCERER_SELECTION_VALUES,
  SOURCERER_TIMELINE_TRIGGER,
  SOURCERER_TRIGGER,
} from '../screens/sourcerer';

export const openSourcerer = () => {
  cy.get(SOURCERER_TRIGGER).should('be.enabled');
  cy.get(SOURCERER_TRIGGER).should('be.visible');
  cy.get(SOURCERER_TRIGGER).click();
};
export const openTimelineSourcerer = () => {
  cy.get(SOURCERER_TIMELINE_TRIGGER).should('be.enabled');
  cy.get(SOURCERER_TIMELINE_TRIGGER).should('be.visible');
  cy.get(SOURCERER_TIMELINE_TRIGGER).click();
};

export const readSourcerer = () => {
  cy.log('children', cy.get(SOURCERER_INPUT).children());
  cy.get(SOURCERER_SELECTION_VALUES).its('length').should('eq', 1);
  return cy.get(SOURCERER_SELECTION_VALUES).first().invoke('text');
};

export const clickOutOfSelector = () => {
  return cy.get(SOURCERER_POPOVER_TITLE).first().click();
};

export const isSourcererSelection = (patternName: string) => {
  return cy.get(SOURCERER_INPUT).find(`span[title="${patternName}"]`).should('exist');
};

export const isHostsStatValue = (value: string) => {
  return cy.get(HOSTS_STAT).first().should('have.text', value);
};

export const isNotSourcererSelection = (patternName: string) => {
  return cy.get(SOURCERER_INPUT).find(`span[title="${patternName}"]`).should('not.exist');
};

export const isSourcererOptions = (patternNames: string[]) => {
  cy.get(SOURCERER_INPUT).click();
  cy.log('SOURCERER_OPTIONS', cy.get(SOURCERER_OPTIONS));
  return patternNames.every((patternName) => {
    return cy
      .get(SOURCERER_OPTIONS)
      .find(`button.euiFilterSelectItem[title="${patternName}"]`)
      .its('length')
      .should('eq', 1);
  });
};

export const selectSourcererOption = (patternName: string) => {
  cy.get(SOURCERER_INPUT).click();
  cy.get(SOURCERER_OPTIONS).find(`button.euiFilterSelectItem[title="${patternName}"]`).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const deselectSourcererOption = (patternName: string) => {
  cy.get(SOURCERER_INPUT).find(`span[title="${patternName}"] button`).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const resetSourcerer = () => {
  cy.get(SOURCERER_RESET_BUTTON).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const setSourcererOption = (patternName: string) => {
  openSourcerer();
  isNotSourcererSelection(patternName);
  selectSourcererOption(patternName);
};

export const unsetSourcererOption = (patternName: string) => {
  openSourcerer();
  isSourcererSelection(patternName);
  deselectSourcererOption(patternName);
};
