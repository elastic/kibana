/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../../common/lib/authentication';
import { SPACES } from '../../../../common/lib/spaces';
import { getTestSuiteFactory } from '../../../../common/suites/get.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function getSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { getTest, createExpectResults } = getTestSuiteFactory(context);

  describe('get', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        otherSpaceId: SPACES.SPACE_1.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_3.spaceId, // This space has a solution set and we expect disabledFeatures to be automatically set
        otherSpaceId: SPACES.DEFAULT.spaceId,
      },
    ].forEach((scenario) => {
      getTest(`superuser`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: AUTHENTICATION.SUPERUSER,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });
    });
  });
}
