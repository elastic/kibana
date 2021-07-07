/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage, loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import {
  ALERTS_URL,
  detectionRuleEditUrl,
  DETECTIONS,
  detectionsRuleDetailsUrl,
  DETECTIONS_RULE_MANAGEMENT_URL,
  ruleDetailsUrl,
  ruleEditUrl,
  RULE_CREATION,
  SECURITY_DETECTIONS_RULES_CREATION_URL,
  SECURITY_DETECTIONS_RULES_URL,
  SECURITY_DETECTIONS_URL,
} from '../../urls/navigation';
import { ABSOLUTE_DATE_RANGE } from '../../urls/state';
import {
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
} from '../../screens/date_picker';
import { cleanKibana } from '../../tasks/common';

const ABSOLUTE_DATE = {
  endTime: '2019-08-01T20:33:29.186Z',
  startTime: '2019-08-01T20:03:29.186Z',
};

const RULE_ID = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

describe('URL compatibility', () => {
  before(() => {
    cleanKibana();
  });

  it('Redirects to alerts from old siem Detections URL', () => {
    loginAndWaitForPage(DETECTIONS);
    cy.url().should('include', ALERTS_URL);
  });

  it('Redirects to alerts from old Detections URL', () => {
    loginAndWaitForPage(SECURITY_DETECTIONS_URL);
    cy.url().should('include', ALERTS_URL);
  });

  it('Redirects to rules from old Detections rules URL', () => {
    loginAndWaitForPage(SECURITY_DETECTIONS_RULES_URL);
    cy.url().should('include', DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('Redirects to rules creation from old Detections rules creation URL', () => {
    loginAndWaitForPage(SECURITY_DETECTIONS_RULES_CREATION_URL);
    cy.url().should('include', RULE_CREATION);
  });

  it('Redirects to rule details from old Detections rule details URL', () => {
    loginAndWaitForPage(detectionsRuleDetailsUrl(RULE_ID));
    cy.url().should('include', ruleDetailsUrl(RULE_ID));
  });

  it('Redirects to rule edit from old Detections rule edit URL', () => {
    loginAndWaitForPage(detectionRuleEditUrl(RULE_ID));
    cy.url().should('include', ruleEditUrl(RULE_ID));
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
