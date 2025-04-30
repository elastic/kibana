/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/delete';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
  { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail400() },
  // try to delete this object again, this time using the `force` option
  { ...CASES.MULTI_NAMESPACE_ALL_SPACES, force: true },
  {
    ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    ...fail400(spaceId === DEFAULT_SPACE_ID || spaceId === SPACE_1_ID),
    ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
  },
  // try to delete this object again, this time using the `force` option
  {
    ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    force: true,
    ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
  },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
  {
    ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
    ...fail404(spaceId !== DEFAULT_SPACE_ID),
  },
  { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  CASES.NAMESPACE_AGNOSTIC,
  { ...CASES.ALIAS_DELETE_INCLUSIVE, force: true },
  { ...CASES.ALIAS_DELETE_EXCLUSIVE, force: true },
  { ...CASES.HIDDEN, ...fail404() },
  { ...CASES.DOES_NOT_EXIST, ...fail404() },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = deleteTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false, { spaceId });
  };

  describe('_delete', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
