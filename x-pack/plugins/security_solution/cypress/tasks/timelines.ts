/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  cy.get(TIMELINE(id)).click();
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(TIMELINES_TABLE).should('exist');
};
