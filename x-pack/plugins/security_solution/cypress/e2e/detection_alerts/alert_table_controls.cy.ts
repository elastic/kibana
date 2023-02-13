/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  DATA_GRID_FIELDS,
  DATA_GRID_FULL_SCREEN,
  GET_DATA_GRID_HEADER,
  GET_DATA_GRID_HEADER_CELL_ACTION_GROUP,
} from '../../screens/shared';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Alert Table Contorls', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('full screen', () => {
    cy.get(DATA_GRID_FULL_SCREEN)
      .should('have.attr', 'aria-label', 'Enter fullscreen')
      .trigger('click')
      .should('have.attr', 'aria-label', 'Exit fullscreen')
      .trigger('click');
  });

  context('Sorting', { testIsolation: false }, () => {
    it('Date Column', () => {
      const timestampField = DATA_GRID_FIELDS.TIMESTAMP.fieldName;
      cy.get(GET_DATA_GRID_HEADER(timestampField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(timestampField))
        .should('be.visible')
        .should('contain.text', 'Sort Old-New');
      cy.get(GET_DATA_GRID_HEADER(timestampField)).trigger('click');
    });

    it('Number column', () => {
      const riskScoreField = DATA_GRID_FIELDS.RISK_SCORE.fieldName;
      cy.get(GET_DATA_GRID_HEADER(riskScoreField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(riskScoreField))
        .should('be.visible')
        .should('contain.text', 'Sort Low-High');
      cy.get(GET_DATA_GRID_HEADER(riskScoreField)).trigger('click');
    });

    it('Text Column', () => {
      const ruleField = DATA_GRID_FIELDS.RULE.fieldName;
      cy.get(GET_DATA_GRID_HEADER(ruleField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(ruleField))
        .should('be.visible')
        .should('contain.text', 'Sort A-Z');
      cy.get(GET_DATA_GRID_HEADER(ruleField)).trigger('click');
    });
  });
});
