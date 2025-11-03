/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../../common/lib/authentication';
import { SPACES } from '../../../../common/lib/spaces';
import { copyToSpaceTestSuiteFactory } from '../../../../common/suites/copy_to_space.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

interface User {
  username: string;
  password: string;
  role: string;
}

export default function copyToSpaceSpacesAndSecuritySuite(
  context: DeploymentAgnosticFtrProviderContext
) {
  const {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    createMultiNamespaceTestCases,
  } = copyToSpaceTestSuiteFactory(context);

  describe('copy to spaces', function () {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          superuser: AUTHENTICATION.SUPERUSER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          superuser: AUTHENTICATION.SUPERUSER,
        },
      },
    ].forEach(({ spaceId, ...scenario }) => {
      const definitionAuthorized = (user: User) => ({
        spaceId,
        user,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: expectNoConflictsWithoutReferencesResult(spaceId),
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: expectNoConflictsWithReferencesResult(spaceId),
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsOverwritingResult(spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult(spaceId),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'authorized'),
        },
      });

      copyToSpaceTest(
        `superuser from the ${spaceId} space`,
        definitionAuthorized(scenario.users.superuser)
      );
    });
  });
}
