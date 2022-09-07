/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';

import { login } from '../../tasks/login';
import { ROLES } from '../../test';

describe('ALL - Saved queries', () => {
  // const randomNumber = getRandomInt();
  // const SAVED_QUERY_ID = `Saved-Query-Id-${randomNumber}`;
  // const SAVED_QUERY_DESCRIPTION = `Test saved query description ${randomNumber}`;

  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  // TODO usnkip after FF
  // getSavedQueriesComplexTest(SAVED_QUERY_ID, SAVED_QUERY_DESCRIPTION);
});
