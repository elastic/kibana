/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MAIN_PAGE, TIMELINE_TOGGLE_BUTTON } from '../screens/security_main';

export const openTimeline = () => {
  cy.get(TIMELINE_TOGGLE_BUTTON).click();
};

export const openTimelineIfClosed = () => {
  cy.get(MAIN_PAGE).then(($page) => {
    if ($page.find(TIMELINE_TOGGLE_BUTTON).length === 1) {
      openTimeline();
    }
  });
};
