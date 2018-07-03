/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestingBackendFrameworkAdapter } from '../testing_framework_adapter';
import { contractTests } from './test_contract';

const settings = {
  encryptionKey: 'something_who_cares',
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};
contractTests('Testing  Framework Adapter', {
  adapter: new TestingBackendFrameworkAdapter(null, settings),
});
