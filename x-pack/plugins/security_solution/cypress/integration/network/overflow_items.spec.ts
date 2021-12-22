/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_TIMELINE,
  COPY,
  EXPAND_OVERFLOW_ITEMS,
  FILTER_IN,
  FILTER_OUT,
  SHOW_TOP_FIELD,
} from '../../screens/network/flows';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';

import { NETWORK_URL } from '../../urls/navigation';

const testDomainOne = 'endpoint-dev-es.app.elstc.co';
const testDomainTwo = 'endpoint2-dev-es.app.elstc.co';

describe('Overfow items', () => {
  context('Network stats and tables', () => {
    beforeEach(() => {
      cleanKibana();
      loginAndWaitForPage(NETWORK_URL);
    });

    it('Shows more items in the popover', () => {
      cy.get(`[data-test-subj="destination.domain-${testDomainOne}"]`).should('not.exist');
      cy.get(`[data-test-subj="destination.domain-${testDomainTwo}"]`).should('not.exist');

      cy.get(EXPAND_OVERFLOW_ITEMS).click();

      cy.get(`[data-test-subj="destination.domain-${testDomainOne}"]`).should('exist');
      cy.get(`[data-test-subj="destination.domain-${testDomainTwo}"]`).should('exist');
    });

    it('Shows Hover actions for more items in the popover', () => {
      cy.get(FILTER_IN).should('not.exist');
      cy.get(FILTER_OUT).should('not.exist');
      cy.get(ADD_TO_TIMELINE).should('not.exist');
      cy.get(SHOW_TOP_FIELD).should('not.exist');
      cy.get(COPY).should('not.exist');

      cy.get(EXPAND_OVERFLOW_ITEMS).click();

      cy.get(FILTER_IN).should('exist');
      cy.get(FILTER_OUT).should('exist');
      cy.get(ADD_TO_TIMELINE).should('exist');
      cy.get(SHOW_TOP_FIELD).should('exist');
      cy.get(COPY).should('exist');
    });
  });
});
