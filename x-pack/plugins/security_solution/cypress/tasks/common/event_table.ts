/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SELECTED_ALERTS } from '../../screens/alerts';
import {
  SELECT_ALL_EVENTS,
  SELECT_EVENTS_ACTION_ADD_BULK_TO_TIMELINE,
} from '../../screens/common/controls';
import { EVENT_VIEWER_CHECKBOX } from '../../screens/hosts/events';

export const selectFirstPageEvents = () => {
  cy.get(EVENT_VIEWER_CHECKBOX).first().scrollIntoView().click();
};

export const selectAllEvents = () => {
  cy.get(EVENT_VIEWER_CHECKBOX).first().scrollIntoView().click();
  cy.get(SELECT_ALL_EVENTS).click();
};

export const bulkInvestigateSelectedEventsInTimeline = () => {
  cy.get(SELECTED_ALERTS).trigger('click');
  cy.get(SELECT_EVENTS_ACTION_ADD_BULK_TO_TIMELINE).click();
};
