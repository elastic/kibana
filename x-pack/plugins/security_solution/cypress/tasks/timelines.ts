/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOADING_INDICATOR } from '../screens/security_header';
import {
  TIMELINE_CHECKBOX,
  BULK_ACTIONS,
  EXPORT_TIMELINE_ACTION,
  TIMELINES_TABLE,
  TIMELINE,
} from '../screens/timelines';

export const exportTimeline = (timelineId: string) => {
  cy.get(TIMELINE_CHECKBOX(timelineId)).click({ force: true });
  cy.get(BULK_ACTIONS).click({ force: true });
  cy.get(EXPORT_TIMELINE_ACTION).click();
};

export const openTimeline = (id: string) => {
  const click = ($el: Cypress.ObjectLike) => cy.wrap($el).click();
  cy.get(TIMELINE(id)).should('be.visible').pipe(click);
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(LOADING_INDICATOR).should('exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
  cy.get(TIMELINES_TABLE).should('exist');
};
