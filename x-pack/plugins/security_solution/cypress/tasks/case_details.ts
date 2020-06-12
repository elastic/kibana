/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINE_TITLE } from '../screens/timeline';
import { CASE_DETAILS_TIMELINE_LINK_MARKDOWN } from '../screens/case_details';

export const openCaseTimeline = () => {
  cy.get(CASE_DETAILS_TIMELINE_LINK_MARKDOWN).click();
  cy.get(TIMELINE_TITLE).should('exist');
};
