/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';
import archives_metadata from '../fixtures/es_archives/archives_metadata';

describe('home', () => {
  const { start, end } = archives_metadata['apm_8.0.0'];

  it('test', () => {
    const baseUrl = url.format({
      pathname: '/app/apm',
      query: { rangeFrom: start, rangeTo: end },
    });

    cy.visit(baseUrl);
  });
});
