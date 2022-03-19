/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';

import { login } from '../../tasks/login';
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';

const SAVED_QUERY_ID = 'Saved-Query-Id-All';
const SAVED_QUERY_DESCRIPTION = 'Test saved query description All';

describe('ALL - Saved queries', () => {
  beforeEach(() => {
    login();
    navigateTo('/app/osquery');
  });

  getSavedQueriesComplexTest(SAVED_QUERY_ID, SAVED_QUERY_DESCRIPTION);
});
