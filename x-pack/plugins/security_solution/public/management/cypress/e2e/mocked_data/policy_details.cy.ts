/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitPolicyDetailsPage } from '../../screens/policy_details';
import { removeAllArtifacts } from '../../tasks/artifacts';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';
import { login } from '../../tasks/login';

describe('Policy Details', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
  });

  after(() => {
    login();
    removeAllArtifacts();
  });

  it('Malware Protection - user should be able to see related rules', () => {
    login();
    visitPolicyDetailsPage();

    cy.getByTestSubj('malwareProtectionsForm').contains('related detection rules').click();

    cy.url().should('contain', 'app/security/rules/management');
  });
});
