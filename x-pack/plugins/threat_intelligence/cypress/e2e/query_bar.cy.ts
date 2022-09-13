/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILTER_IN_BUTTON,
  FILTER_OUT_BUTTON,
  FILTER_IN_COMPONENT,
  FILTER_OUT_COMPONENT,
  INDICATOR_TYPE_CELL,
  TOGGLE_FLYOUT_BUTTON,
  FLYOUT_CLOSE_BUTTON,
  KQL_FILTER,
} from '../screens/indicators';
import { selectRange } from '../tasks/select_range';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

before(() => {
  login();
});

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Indicators', () => {
  before(() => {
    esArchiverLoad('threat_intelligence');
  });
  after(() => {
    esArchiverUnload('threat_intelligence');
  });

  describe('Indicators query bar interaction', () => {
    before(() => {
      cy.visit(THREAT_INTELLIGENCE);

      selectRange();
    });

    it('should filter in and out values when clicking in an indicators table cell', () => {
      cy.get(INDICATOR_TYPE_CELL).first().trigger('mouseover');
      cy.get(FILTER_IN_COMPONENT).should('exist');
      cy.get(FILTER_OUT_COMPONENT).should('exist');
    });

    it('should filter in and out values when clicking in an indicators flyout table action column', () => {
      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FILTER_OUT_BUTTON).should('exist');
      cy.get(FILTER_IN_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');

      cy.get(TOGGLE_FLYOUT_BUTTON).first().click({ force: true });
      cy.get(FILTER_IN_BUTTON).should('exist');
      cy.get(FILTER_OUT_BUTTON).should('exist').first().click();
      cy.get(FLYOUT_CLOSE_BUTTON).should('exist').click();
      cy.get(KQL_FILTER).should('exist');
    });
  });
});
