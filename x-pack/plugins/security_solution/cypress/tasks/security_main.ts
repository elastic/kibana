/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOSE_TIMELINE_BUTTON,
  TIMELINE_TOGGLE_BUTTON,
  TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON,
} from '../screens/security_main';
import { TIMELINE_EXIT_FULL_SCREEN_BUTTON, TIMELINE_FULL_SCREEN_BUTTON } from '../screens/timeline';

export const openTimelineUsingToggle = () => {
  cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).click();
};

export const closeTimelineUsingToggle = () => {
  cy.get(TIMELINE_TOGGLE_BUTTON).filter(':visible').click();
};

export const closeTimelineUsingCloseButton = () => {
  cy.get(CLOSE_TIMELINE_BUTTON).filter(':visible').click();
};

export const enterFullScreenMode = () => {
  cy.get(TIMELINE_FULL_SCREEN_BUTTON).first().click({ force: true });
};

export const exitFullScreenMode = () => {
  cy.get(TIMELINE_EXIT_FULL_SCREEN_BUTTON).first().click({ force: true });
};
