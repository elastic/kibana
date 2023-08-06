/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_INPUT,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  SHOW_DATES_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_SHOW_DATE_POPOVER_BUTTON,
  DATE_PICKER_NOW_TAB,
  DATE_PICKER_NOW_BUTTON,
  LOCAL_DATE_PICKER_APPLY_BUTTON,
  LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_CONTAINER,
  GET_LOCAL_SHOW_DATES_BUTTON,
} from '../screens/date_picker';

export const setEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(date);
};

export const setEndDateNow = () => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_NOW_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_NOW_BUTTON).click();
};

export const setStartDate = (date: string) => {
  cy.get(DATE_PICKER_CONTAINER).should('be.visible');
  cy.get('body').then(($container) => {
    if ($container.find(SHOW_DATES_BUTTON).length > 0) {
      cy.get(DATE_PICKER_SHOW_DATE_POPOVER_BUTTON).click({ force: true });
    } else {
      cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });
    }
  });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(date);

  cy.get(DATE_PICKER_APPLY_BUTTON).click();
};

export const setTimelineEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click({ force: true });
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click({ force: true });
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const setTimelineStartDate = (date: string) => {
  cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).first().click({
    force: true,
  });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click({ force: true });
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click({ force: true });
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const updateDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON).click({ force: true });
  cy.get(DATE_PICKER_APPLY_BUTTON).should('not.have.text', 'Updating');
};

export const updateTimelineDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).first().click({ force: true });
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).first().should('not.have.text', 'Updating');
};

export const updateDateRangeInLocalDatePickers = (
  localQueryBarSelector: string,
  startDate: string,
  endDate: string
) => {
  cy.get(GET_LOCAL_SHOW_DATES_BUTTON(localQueryBarSelector)).click();
  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(startDate);
  cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON).click();
  cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON).should('not.have.text', 'Updating');

  cy.get(LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON).click();

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(endDate);
  cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON).click();
};
