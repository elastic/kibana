/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_POLICIES_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';

// remove this file after other tests can run
describe(
  'placeholder for running at least one `endpoint` test case',
  { tags: '@serverless' },
  () => {
    it('placeholder', () => {
      login();
      cy.visit(APP_POLICIES_PATH);
    });
  }
);
