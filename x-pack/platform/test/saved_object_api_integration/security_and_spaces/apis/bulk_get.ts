/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES, ALL_SPACES_ID } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  bulkGetTestSuiteFactory,
  TEST_CASES as CASES,
  BulkGetTestCase,
  BulkGetTestDefinition,
} from '../../common/suites/bulk_get';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    CASES.MULTI_NAMESPACE_ALL_SPACES,
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
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
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const badRequests = [
    { ...CASES.HIDDEN, ...fail400() },
    {
      ...CASES.SINGLE_NAMESPACE_SPACE_2,
      namespaces: ['x', 'y'],
      ...fail400(), // cannot be searched for in multiple spaces -- second try below succeeds
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
      namespaces: [ALL_SPACES_ID],
      ...fail400(), // cannot be searched for in multiple spaces -- second try below succeeds
    },
  ];
  const crossNamespace = [
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, namespaces: [SPACE_2_ID] }, // second try searches for it in a single other space, which is valid
    { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, namespaces: [SPACE_1_ID] }, // second try searches for it in a single other space, which is valid
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, namespaces: [SPACE_2_ID], ...fail404() },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, namespaces: [SPACE_2_ID, 'x'] }, // unknown space is allowed / ignored
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, namespaces: [ALL_SPACES_ID] }, // this is different than the same test case in the spaces_only suite, since MULTI_NAMESPACE_ONLY_SPACE_1 *may* return a 404 error to a partially authorized user
  ];
  const allTypes = [...normalTypes, ...badRequests, ...crossNamespace];
  return { normalTypes, badRequests, crossNamespace, allTypes };
};

export default function (context: FtrProviderContext) {
  const { addTests, createTestDefinitions, expectSavedObjectForbidden } =
    bulkGetTestSuiteFactory(context);
  const createTests = (spaceId: string) => {
    const { normalTypes, badRequests, crossNamespace, allTypes } = createTestCases(spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
    const singleRequest = true;
    const crossNamespaceAuthorizedAtSpace = crossNamespace.reduce<{
      authorized: BulkGetTestCase[];
      unauthorized: BulkGetTestCase[];
    }>(
      ({ authorized, unauthorized }, cur) => {
        // A user who is only authorized in a single space will be authorized to execute some of the cross-namespace test cases, but not all
        if (cur.namespaces.some((x) => ![ALL_SPACES_ID, spaceId].includes(x))) {
          return { authorized, unauthorized: [...unauthorized, cur] };
        }
        return { authorized: [...authorized, cur], unauthorized };
      },
      { authorized: [], unauthorized: [] }
    );

    return {
      unauthorized: [
        createTestDefinitions(normalTypes, true),
        createTestDefinitions(badRequests, false, { singleRequest }), // validation for hidden type and initialNamespaces returns 400 Bad Request before authZ check
        createTestDefinitions(crossNamespace, true),
        createTestDefinitions(allTypes, true, {
          singleRequest,
          responseBodyOverride: expectSavedObjectForbidden([
            'dashboard,globaltype,isolatedtype,sharecapabletype,sharedtype', // 'hiddentype' is not included in the 403 message, it was filtered out before the authZ check
          ]),
        }),
      ].flat(),
      authorizedAtSpace: [
        createTestDefinitions(normalTypes, false, { singleRequest }),
        createTestDefinitions(badRequests, false, { singleRequest }), // validation for hidden type and initialNamespaces returns 400 Bad Request before authZ check
        createTestDefinitions(crossNamespaceAuthorizedAtSpace.authorized, false, { singleRequest }),
        createTestDefinitions(crossNamespaceAuthorizedAtSpace.unauthorized, true),
        createTestDefinitions(allTypes, true, {
          singleRequest,
          responseBodyOverride: expectSavedObjectForbidden(
            spaceId === DEFAULT_SPACE_ID
              ? // While the Default space is active, we always attempt to get 'sharecapabletype' (MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1)
                // with a cross-namespace check in Space 1, and fail the authZ check for 'sharecapabletype' in Space 1 because these users
                // are only authorized for the Default space!
                // 'hiddentype' is not included in either 403 message, it was filtered out before the authZ check
                ['isolatedtype,sharecapabletype,sharedtype']
              : ['isolatedtype,sharedtype']
          ),
        }),
      ].flat(),
      authorizedEverywhere: createTestDefinitions(allTypes, false, { singleRequest }),
    };
  };

  describe('_bulk_get', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorizedAtSpace, authorizedEverywhere } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: BulkGetTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [users.noAccess, users.legacyAll, users.allAtOtherSpace].forEach((user) => {
        _addTests(user, unauthorized);
      });

      [users.allAtSpace, users.readAtSpace].forEach((user) => {
        _addTests(user, authorizedAtSpace);
      });

      [
        users.dualAll,
        users.dualRead,
        users.allGlobally,
        users.readGlobally,
        users.superuser,
      ].forEach((user) => {
        _addTests(user, authorizedEverywhere);
      });
    });
  });
}
