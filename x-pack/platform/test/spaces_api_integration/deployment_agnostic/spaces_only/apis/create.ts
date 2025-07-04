/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../../common/lib/spaces';
import { createTestSuiteFactory } from '../../../common/suites/create.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function createSpacesOnlySuite(context: DeploymentAgnosticFtrProviderContext) {
  const {
    createTest,
    expectNewSpaceResult,
    expectConflictResponse,
    expectReservedSpecifiedResult,
    expectSolutionSpecifiedResult,
  } = createTestSuiteFactory(context);

  describe('create', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      createTest(`from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
          solutionSpecified: {
            statusCode: 200,
            response: expectSolutionSpecifiedResult,
          },
        },
      });
    });
  });
}
