/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import {
  getTestScenarios,
  isUserAuthorizedAtSpace,
} from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (currentSpace: string, crossSpaceSearch?: string[]) => {
  const cases = getTestCases({ currentSpace, crossSpaceSearch });

  const normalTypes = [
    cases.singleNamespaceType,
    cases.multiNamespaceType,
    cases.multiNamespaceIsolatedType,
    cases.namespaceAgnosticType,
    cases.eachType,
    cases.pageBeyondTotal,
    cases.unknownSearchField,
    cases.filterWithNamespaceAgnosticType,
  ];
  const badRequestTypes = [cases.filterWithDisallowedType];
  const hiddenAndUnknownTypes = [
    cases.hiddenType,
    cases.unknownType,
    cases.filterWithHiddenType,
    cases.filterWithUnknownType,
  ];
  return {
    normalTypes,
    badRequestTypes,
    hiddenAndUnknownTypes,
  };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = findTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string, user: TestUser) => {
    const currentSpaceCases = createTestCases(spaceId);

    const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
    const explicitCrossSpace = createTestCases(spaceId, EACH_SPACE);
    const wildcardCrossSpace = createTestCases(spaceId, ['*']);

    const isAuthorizedExplicitCrossSpaces = EACH_SPACE.some(
      (s) => s !== spaceId && isUserAuthorizedAtSpace(user, s)
    );
    const isAuthorizedWildcardCrossSpaces = EACH_SPACE.some((s) =>
      isUserAuthorizedAtSpace(user, s)
    );

    const explicitCrossSpaceDefinitions = isAuthorizedExplicitCrossSpaces
      ? [
          createTestDefinitions(explicitCrossSpace.normalTypes, false, { user }),
          createTestDefinitions(
            explicitCrossSpace.hiddenAndUnknownTypes,
            { statusCode: 200, reason: 'unauthorized' },
            { user }
          ),
        ].flat()
      : createTestDefinitions(
          [explicitCrossSpace.normalTypes, explicitCrossSpace.hiddenAndUnknownTypes].flat(),
          { statusCode: 200, reason: 'unauthorized' },
          { user }
        );
    const wildcardCrossSpaceDefinitions = isAuthorizedWildcardCrossSpaces
      ? [
          createTestDefinitions(wildcardCrossSpace.normalTypes, false, { user }),
          createTestDefinitions(
            wildcardCrossSpace.hiddenAndUnknownTypes,
            { statusCode: 200, reason: 'unauthorized' },
            { user }
          ),
        ].flat()
      : createTestDefinitions(
          [wildcardCrossSpace.normalTypes, wildcardCrossSpace.hiddenAndUnknownTypes].flat(),
          { statusCode: 200, reason: 'unauthorized' },
          { user }
        );

    const currentSpaceDefinitions = isUserAuthorizedAtSpace(user, spaceId)
      ? [
          createTestDefinitions(currentSpaceCases.normalTypes, false, { user }),
          createTestDefinitions(
            currentSpaceCases.hiddenAndUnknownTypes,
            { statusCode: 200, reason: 'unauthorized' },
            { user }
          ),
        ].flat()
      : createTestDefinitions(
          [currentSpaceCases.normalTypes, currentSpaceCases.hiddenAndUnknownTypes].flat(),
          { statusCode: 200, reason: 'unauthorized' },
          { user }
        );
    return {
      currentSpace: [
        currentSpaceDefinitions,
        createTestDefinitions(currentSpaceCases.badRequestTypes, false, { user }), // validation for filter returns 400 Bad Request before authZ check
      ].flat(),
      crossSpace: [
        explicitCrossSpaceDefinitions,
        wildcardCrossSpaceDefinitions,
        createTestDefinitions(explicitCrossSpace.badRequestTypes, false, { user }), // validation for filter returns 400 Bad Request before authZ check
        createTestDefinitions(wildcardCrossSpace.badRequestTypes, false, { user }), // validation for filter returns 400 Bad Request before authZ check
      ].flat(),
    };
  };

  describe('_find', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;

      Object.values(users).forEach((user) => {
        const { currentSpace, crossSpace } = createTests(spaceId, user);
        addTests(`${user.description}${suffix}`, {
          user,
          spaceId,
          tests: [...currentSpace, ...crossSpace],
        });
      });
    });
  });
}
