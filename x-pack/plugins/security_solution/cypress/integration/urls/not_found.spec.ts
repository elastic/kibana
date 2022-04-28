/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';

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

import { NOT_FOUND } from '../../screens/common/page';

const mockRuleId = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

describe('Display not found page', () => {
  before(() => {
    login();
    visit(TIMELINES_URL);
  });

  it('navigates to the alerts page with incorrect link', () => {
    visit(`${ALERTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the exceptions page with incorrect link', () => {
    visit(`${EXCEPTIONS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules page with incorrect link', () => {
    visit(`${DETECTIONS_RULE_MANAGEMENT_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules creation page with incorrect link', () => {
    visit(`${RULE_CREATION}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the rules details page with incorrect link', () => {
    visit(`${ruleDetailsUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the edit rules page with incorrect link', () => {
    visit(`${ruleEditUrl(mockRuleId)}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the endpoints page with incorrect link', () => {
    visit(`${ENDPOINTS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the trusted applications page with incorrect link', () => {
    visit(`${TRUSTED_APPS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });

  it('navigates to the event filters page with incorrect link', () => {
    visit(`${EVENT_FILTERS_URL}/randomUrl`);
    cy.get(NOT_FOUND).should('exist');
  });
});
