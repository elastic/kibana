/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLOSE_TIMELINE_BUTTON,
  MAIN_PAGE,
  TIMELINE_TOGGLE_BUTTON,
  TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON,
} from '../screens/security_main';

export const openTimelineUsingToggle = () => {
  cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).click();
};

export const closeTimelineUsingToggle = () => {
  cy.get(TIMELINE_TOGGLE_BUTTON).filter(':visible').click();
};

export const closeTimelineUsingCloseButton = () => {
  cy.get(CLOSE_TIMELINE_BUTTON).filter(':visible').click();
};

export const openTimelineIfClosed = () =>
  cy.get(MAIN_PAGE).then(($page) => {
    if ($page.find(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).length === 1) {
      openTimelineUsingToggle();
    }
  });
