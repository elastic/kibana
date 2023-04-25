/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

describe('Enterprise Search Crawler', () => {
  it('test', () => {
    login();
    cy.visit('/app/enterprise_search/content/search_indices/new_index');
  });
});
