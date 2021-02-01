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
  // This temporary wait here is to reduce flakeyness until we integrate cypress-pipe. Then please let us use cypress pipe.
  // Ref: https://www.cypress.io/blog/2019/01/22/when-can-the-test-click/
  // Ref: https://github.com/NicholasBoll/cypress-pipe#readme
  cy.get(TIMELINE(id)).should('be.visible').wait(1500).click();
};

export const waitForTimelinesPanelToBeLoaded = () => {
  cy.get(TIMELINES_TABLE).should('exist');
};
