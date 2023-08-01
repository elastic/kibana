/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { login, visitHostDetailsPage } from '../../../tasks/login';

import { cleanKibana, waitForTableToLoad } from '../../../tasks/common';
import { TABLE_CELL, TABLE_ROWS } from '../../../screens/alerts_details';

describe('risk tab', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', 'risk_hosts');
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_hosts');
  });

  it('renders risk tab', () => {
    visitHostDetailsPage('siem-kibana');
    cy.get('[data-test-subj="navigation-hostRisk"]').click();
    waitForTableToLoad();

    cy.get('[data-test-subj="topRiskScoreContributors"]')
      .find(TABLE_ROWS)
      .within(() => {
        cy.get(TABLE_CELL).contains('Unusual Linux Username');
      });
  });

  it('shows risk information overlay when button is clicked', () => {
    visitHostDetailsPage('siem-kibana');
    cy.get('[data-test-subj="navigation-hostRisk"]').click();
    waitForTableToLoad();

    cy.get('[data-test-subj="open-risk-information-flyout-trigger"]').click();

    cy.get('[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader').contains(
      'How is host risk calculated?'
    );
  });
});
