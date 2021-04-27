/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverLoad } from '../tasks/es_archiver';

describe('Home page', () => {
  before(() => {
    cy.loginAs({ username: 'apm_read_user', password: 'changeme' });
  });
  it('Redirects to service page with rangeFrom and rangeTo added to the URL', () => {
    // esArchiverLoad('apm_8.0.0');
    cy.visit('/app/apm');

    cy.url().should(
      'include',
      'app/apm/services?rangeFrom=now-15m&rangeTo=now'
    );
    cy.get('.euiTabs .euiTab-isSelected').contains('Services');
  });
});
