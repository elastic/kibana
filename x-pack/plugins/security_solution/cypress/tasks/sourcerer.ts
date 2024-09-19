/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOSTS_STAT,
  SOURCERER_INPUT,
  SOURCERER_OPTIONS,
  SOURCERER_POPOVER_TITLE,
  SOURCERER_RESET_BUTTON,
  SOURCERER_SAVE_BUTTON,
  SOURCERER_TIMELINE,
  SOURCERER_TRIGGER,
} from '../screens/sourcerer';
import { TIMELINE_TITLE } from '../screens/timeline';

export const openSourcerer = (sourcererScope?: string) => {
  if (sourcererScope != null && sourcererScope === 'timeline') {
    return openTimelineSourcerer();
  }
  cy.get(SOURCERER_TRIGGER).should('be.enabled');
  cy.get(SOURCERER_TRIGGER).should('be.visible');
  cy.get(SOURCERER_TRIGGER).click();
};
export const openTimelineSourcerer = () => {
  cy.get(SOURCERER_TIMELINE.trigger).should('be.enabled');
  cy.get(SOURCERER_TIMELINE.trigger).should('be.visible');
  cy.get(SOURCERER_TIMELINE.trigger).click();
  cy.get(SOURCERER_TIMELINE.advancedSettings).should(($div) => {
    if ($div.text() === 'Show Advanced') {
      $div.click();
    }
    expect(true).to.eq(true);
  });
};
export const openAdvancedSettings = () => {};

export const clickOutOfSelector = () => {
  return cy.get(SOURCERER_POPOVER_TITLE).first().click();
};

const getScopedSelectors = (sourcererScope?: string): { input: string; options: string } =>
  sourcererScope != null && sourcererScope === 'timeline'
    ? { input: SOURCERER_TIMELINE.sourcererInput, options: SOURCERER_TIMELINE.sourcererOptions }
    : { input: SOURCERER_INPUT, options: SOURCERER_OPTIONS };

export const isSourcererSelection = (patternName: string, sourcererScope?: string) => {
  const { input } = getScopedSelectors(sourcererScope);
  return cy.get(input).find(`span[title="${patternName}"]`).should('exist');
};

export const isHostsStatValue = (value: string) => {
  return cy.get(HOSTS_STAT).first().should('have.text', value);
};

export const isNotSourcererSelection = (patternName: string, sourcererScope?: string) => {
  const { input } = getScopedSelectors(sourcererScope);
  return cy.get(input).find(`span[title="${patternName}"]`).should('not.exist');
};

export const isSourcererOptions = (patternNames: string[], sourcererScope?: string) => {
  const { input, options } = getScopedSelectors(sourcererScope);
  cy.get(input).click();
  return patternNames.every((patternName) => {
    return cy
      .get(options)
      .find(`button.euiFilterSelectItem[title="${patternName}"]`)
      .its('length')
      .should('eq', 1);
  });
};

export const selectSourcererOption = (patternName: string, sourcererScope?: string) => {
  const { input, options } = getScopedSelectors(sourcererScope);
  cy.get(input).click();
  cy.get(options).find(`button.euiFilterSelectItem[title="${patternName}"]`).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const deselectSourcererOption = (patternName: string, sourcererScope?: string) => {
  const { input } = getScopedSelectors(sourcererScope);
  cy.get(input).find(`span[title="${patternName}"] button`).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const deselectSourcererOptions = (patternNames: string[], sourcererScope?: string) => {
  const { input } = getScopedSelectors(sourcererScope);
  patternNames.forEach((patternName) =>
    cy.get(input).find(`span[title="${patternName}"] button`).click()
  );
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const resetSourcerer = () => {
  cy.get(SOURCERER_RESET_BUTTON).click();
  clickOutOfSelector();
  return cy.get(SOURCERER_SAVE_BUTTON).click({ force: true });
};

export const setSourcererOption = (patternName: string, sourcererScope?: string) => {
  openSourcerer(sourcererScope);
  isNotSourcererSelection(patternName, sourcererScope);
  selectSourcererOption(patternName, sourcererScope);
};

export const unsetSourcererOption = (patternName: string, sourcererScope?: string) => {
  openSourcerer(sourcererScope);
  isSourcererSelection(patternName, sourcererScope);
  deselectSourcererOption(patternName, sourcererScope);
};

export const clickTimelineRadio = (radioName: string) => {
  let theRadio = SOURCERER_TIMELINE.radioAll;
  if (radioName === 'alert') {
    theRadio = SOURCERER_TIMELINE.radioAlert;
  }
  if (radioName === 'raw') {
    theRadio = SOURCERER_TIMELINE.radioRaw;
  }
  return cy.get(theRadio).first().click();
};

export const isCustomRadio = () => {
  return cy.get(SOURCERER_TIMELINE.radioCustom).should('be.enabled');
};

export const isNotCustomRadio = () => {
  return cy.get(SOURCERER_TIMELINE.radioCustom).should('be.disabled');
};

export const clickOutOfSourcererTimeline = () => cy.get(TIMELINE_TITLE).first().click();
