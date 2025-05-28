/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { resolveTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/resolve';

const {
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  CASES.EXACT_MATCH,
  { ...CASES.ALIAS_MATCH, ...fail404(spaceId === SPACE_2_ID) }, // the alias exists in the default space and space_1, but not space_2
  {
    ...CASES.CONFLICT,
    // the default expectedOutcome for this case is 'conflict'; the alias exists in the default space and space_1, but not space_2
    // if we are testing in space_2, the expectedOutcome should be 'exactMatch' instead
    ...(spaceId === SPACE_2_ID && { expectedOutcome: 'exactMatch' as const }),
  },
  { ...CASES.DISABLED, ...fail404() },
  { ...CASES.HIDDEN, ...fail400() },
  { ...CASES.DOES_NOT_EXIST, ...fail404() },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = resolveTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false, { spaceId });
  };

  describe('_resolve', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
