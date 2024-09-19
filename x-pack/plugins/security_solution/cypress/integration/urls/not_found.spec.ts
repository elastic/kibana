/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../../tasks/login';

import {
  ALERTS_URL,
  ENDPOINTS_URL,
  TRUSTED_APPS_URL,
  EVENT_FILTERS_URL,
  TIMELINES_URL,
  EXCEPTIONS_URL,
  DETECTIONS_RULE_MANAGEMENT_URL,
  RULE_CREATION,
  ruleEditUrl,
  ruleDetailsUrl,
} from '../../urls/navigation';

import { cleanKibana } from '../../tasks/common';
import { NOT_FOUND } from '../../screens/common/page';

const mockRuleId = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

describe('Display not found page', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(TIMELINES_URL);
  });

  it('navigates to the alerts page with incorrect link', () => {
    loginAndWaitForPage(`${ALERTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the exceptions page with incorrect link', () => {
    loginAndWaitForPage(`${EXCEPTIONS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules page with incorrect link', () => {
    loginAndWaitForPage(`${DETECTIONS_RULE_MANAGEMENT_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules creation page with incorrect link', () => {
    loginAndWaitForPage(`${RULE_CREATION}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules details page with incorrect link', () => {
    loginAndWaitForPage(`${ruleDetailsUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the edit rules page with incorrect link', () => {
    loginAndWaitForPage(`${ruleEditUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the endpoints page with incorrect link', () => {
    loginAndWaitForPage(`${ENDPOINTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the trusted applications page with incorrect link', () => {
    loginAndWaitForPage(`${TRUSTED_APPS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the event filters page with incorrect link', () => {
    loginAndWaitForPage(`${EVENT_FILTERS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });
});
