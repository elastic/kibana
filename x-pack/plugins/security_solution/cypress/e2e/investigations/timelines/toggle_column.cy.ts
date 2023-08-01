/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { ID_HEADER_FIELD, TIMESTAMP_HEADER_FIELD } from '../../../screens/timeline';
import { cleanKibana } from '../../../tasks/common';

import { login, visit } from '../../../tasks/login';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  clickIdToggleField,
  expandFirstTimelineEventDetails,
  populateTimeline,
  clickTimestampToggleField,
} from '../../../tasks/timeline';

import { HOSTS_URL } from '../../../urls/navigation';

describe('toggle column in timeline', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.intercept('POST', '/api/timeline/_export?file_name=timelines_export.ndjson').as('export');
  });

  beforeEach(() => {
    login();
    visit(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
  });

  it('removes the @timestamp field from the timeline when the user un-checks the toggle', () => {
    expandFirstTimelineEventDetails();
    clickTimestampToggleField();

    cy.get(TIMESTAMP_HEADER_FIELD).should('not.exist');
  });

  it('adds the _id field to the timeline when the user checks the field', () => {
    expandFirstTimelineEventDetails();
    clickIdToggleField();

    cy.get(ID_HEADER_FIELD).should('exist');
  });
});
