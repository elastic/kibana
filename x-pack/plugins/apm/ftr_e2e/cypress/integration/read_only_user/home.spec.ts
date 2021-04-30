/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import archives_metadata from '../../fixtures/es_archiver/archives_metadata';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
const { start, end } = archives_metadata['apm_8.0.0'];

describe('Home page', () => {
  before(() => {
    esArchiverLoad('apm_8.0.0');
    cy.loginAsReadOnlyUser();
  });
  after(() => {
    esArchiverUnload('apm_8.0.0');
  });
  it('Redirects to service page with rangeFrom and rangeTo added to the URL', () => {
    const baseUrl = url.format({
      pathname: '/app/apm',
      query: { rangeFrom: start, rangeTo: end },
    });

    cy.visit(baseUrl);
    cy.get('.euiTabs .euiTab-isSelected').contains('Services');
  });
});
