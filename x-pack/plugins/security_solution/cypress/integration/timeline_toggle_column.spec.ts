/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ID_HEADER_FIELD,
  ID_TOGGLE_FIELD,
  TIMESTAMP_HEADER_FIELD,
  TIMESTAMP_TOGGLE_FIELD,
} from '../screens/timeline';

import { loginAndWaitForPage } from '../tasks/login';
import { openTimeline } from '../tasks/security_main';
import {
  checkIdToggleField,
  createNewTimeline,
  dragAndDropIdToggleFieldToTimeline,
  expandFirstTimelineEventDetails,
  populateTimeline,
  uncheckTimestampToggleField,
} from '../tasks/timeline';

import { HOSTS_URL } from '../urls/navigation';

describe('toggle column in timeline', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_URL);
  });

  beforeEach(() => {
    openTimeline();
    populateTimeline();
  });

  afterEach(() => {
    createNewTimeline();
  });

  it('displays a checked Toggle field checkbox for `@timestamp`, a default timeline column', () => {
    expandFirstTimelineEventDetails();
    cy.get(TIMESTAMP_TOGGLE_FIELD).should('be.checked');
  });

  it('displays an Unchecked Toggle field checkbox for `_id`, because it is NOT a default timeline column', () => {
    cy.get(ID_TOGGLE_FIELD).should('not.be.checked');
  });

  it('removes the @timestamp field from the timeline when the user un-checks the toggle', () => {
    expandFirstTimelineEventDetails();
    uncheckTimestampToggleField();

    cy.get(TIMESTAMP_HEADER_FIELD).should('not.exist');
  });

  it('adds the _id field to the timeline when the user checks the field', () => {
    expandFirstTimelineEventDetails();
    checkIdToggleField();

    cy.get(ID_HEADER_FIELD).should('exist');
  });

  it('adds the _id field to the timeline via drag and drop', () => {
    expandFirstTimelineEventDetails();
    dragAndDropIdToggleFieldToTimeline();

    cy.get(ID_HEADER_FIELD).should('exist');
  });
});
