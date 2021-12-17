/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../tasks/navigation';
import { checkResults, inputQuery, selectAllAgents, submitQuery } from '../tasks/live_query';
import { login } from '../tasks/login';

describe('Run live query', () => {
  before(() => {
    login();
  });

  it('should run live query', () => {
    navigateTo('/app/osquery/live_queries/new');
    selectAllAgents();
    inputQuery();
    submitQuery();
    checkResults();
  });
});
