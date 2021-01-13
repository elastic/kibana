/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esArchiverLoad, esArchiverUnload } from '../task/es_archiver';

describe('home', () => {
  before(() => {
    esArchiverLoad('apm_8.0.0');
  });
  after(() => {
    esArchiverUnload('apm_8.0.0');
  });

  it('test', () => {
    cy.visit('/');
  });
});
