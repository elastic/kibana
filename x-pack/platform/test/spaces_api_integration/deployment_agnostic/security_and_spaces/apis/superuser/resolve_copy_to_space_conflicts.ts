/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../../common/lib/authentication';
import { createSpaces, deleteSpaces } from '../../../../common/lib/space_test_utils';
import { SPACES } from '../../../../common/lib/spaces';
import { resolveCopyToSpaceConflictsSuite } from '../../../../common/suites/resolve_copy_to_space_conflicts.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

interface TestUser {
  username: string;
  password: string;
  role: string;
}

export default function resolveCopyToSpaceConflictsTestSuite(
  context: DeploymentAgnosticFtrProviderContext
) {
  const {
    resolveCopyToSpaceConflictsTest,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    createMultiNamespaceTestCases,
    NON_EXISTENT_SPACE_ID,
  } = resolveCopyToSpaceConflictsSuite(context);
  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');

  describe('resolve copy to spaces conflicts', () => {
    before(async () => {
      await createSpaces(spacesService, isServerless);
    });

    after(async () => {
      await deleteSpaces(spacesService);
    });

    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach(({ spaceId }) => {
      const definitionAuthorized = (user: TestUser) => ({
        spaceId,
        user,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithReferences(spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithReferences(spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithoutReferences(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(
              spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'authorized'),
        },
      });

      resolveCopyToSpaceConflictsTest(
        `superuser from the ${spaceId} space`,
        definitionAuthorized(AUTHENTICATION.SUPERUSER)
      );
    });
  });
}
