/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage, loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';
import { ABSOLUTE_DATE_RANGE } from '../urls/state';
import {
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
} from '../screens/date_picker';

const ABSOLUTE_DATE = {
  endTime: '2019-08-01T20:33:29.186Z',
  startTime: '2019-08-01T20:03:29.186Z',
};

describe('URL compatibility', () => {
  it('Redirects to Detection alerts from old Detections URL', () => {
    loginAndWaitForPage(DETECTIONS);

    cy.url().should('include', '/security/detections');
  });

  it('sets the global start and end dates from the url with timestamps', () => {
    loginAndWaitForPageWithoutDateRange(ABSOLUTE_DATE_RANGE.urlWithTimestamps);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTime
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should('have.attr', 'title', ABSOLUTE_DATE.endTime);
  });
});
