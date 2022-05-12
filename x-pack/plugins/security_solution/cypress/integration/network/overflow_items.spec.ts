/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_TIMELINE,
  COPY,
  DESTINATION_DOMAIN,
  FILTER_IN,
  FILTER_OUT,
  SHOW_TOP_FIELD,
} from '../../screens/network/flows';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { login, visit } from '../../tasks/login';
import { openHoverActions } from '../../tasks/network/flows';

import { NETWORK_URL } from '../../urls/navigation';

const testDomainOne = 'myTest';
const testDomainTwo = 'myTest2';

describe('Overflow items', () => {
  context('Network stats and tables', () => {
    before(() => {
      esArchiverLoad('network');
      login();
      visit(NETWORK_URL);
      cy.get(DESTINATION_DOMAIN(testDomainOne)).should('not.exist');
      cy.get(DESTINATION_DOMAIN(testDomainTwo)).should('not.exist');
      cy.get(FILTER_IN).should('not.exist');
      cy.get(FILTER_OUT).should('not.exist');
      cy.get(ADD_TO_TIMELINE).should('not.exist');
      cy.get(SHOW_TOP_FIELD).should('not.exist');
      cy.get(COPY).should('not.exist');

      openHoverActions();
    });

    after(() => {
      esArchiverUnload('network');
    });

    it('Shows more items in the popover', () => {
      cy.get(DESTINATION_DOMAIN(testDomainOne)).should('exist');
      cy.get(DESTINATION_DOMAIN(testDomainTwo)).should('exist');
    });

    it('Shows Hover actions for more items in the popover', () => {
      cy.get(FILTER_IN).should('exist');
      cy.get(FILTER_OUT).should('exist');
      cy.get(ADD_TO_TIMELINE).should('exist');
      cy.get(SHOW_TOP_FIELD).should('exist');
      cy.get(COPY).should('exist');
    });
  });
});
