/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../../common/lib/authentication';
import { createSpaces, deleteSpaces } from '../../../../common/lib/space_test_utils';
import { SPACES } from '../../../../common/lib/spaces';
import { getAllTestSuiteFactory } from '../../../../common/suites/get_all.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function getAllSpacesTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { getAllTest, createExpectResults, createExpectAllPurposesResults } =
    getAllTestSuiteFactory(context);

  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');

  const spaces = ['default', 'space_1', 'space_2', 'space_3'];

  // these are used to determine expected results for tests where the `include_authorized_purposes` option is enabled
  const authorizedAll = {
    any: true,
    copySavedObjectsIntoSpace: true,
    findSavedObjects: true,
    shareSavedObjectsIntoSpace: true,
  };

  describe('get all', () => {
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
    ].forEach((scenario) => {
      getAllTest(`superuser can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: AUTHENTICATION.SUPERUSER,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults(...spaces),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults(...spaces),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults(...spaces),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedAll, ...spaces),
          },
        },
      });
    });
  });
}
