/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACE_1, SPACE_2, SPACE_3, SPACES } from '../../../common/lib/spaces';
import { getTestSuiteFactory } from '../../../common/suites/get.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function getSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { getTest, createExpectResults, createExpectNotFoundResult, nonExistantSpaceId } =
    getTestSuiteFactory(context);

  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');
  const createSpaces = async () => {
    await spacesService.create(SPACE_1);
    await spacesService.create(SPACE_2);
    await spacesService.create({ ...SPACE_3, ...(isServerless ? {} : { solution: 'es' }) });
  };

  const deleteSpaces = async () => {
    await spacesService.delete(SPACE_1.id);
    await spacesService.delete(SPACE_2.id);
    await spacesService.delete(SPACE_3.id);
  };

  describe('get', () => {
    before(async () => {
      await createSpaces();
    });
    after(async () => {
      await deleteSpaces();
    });

    // valid spaces
    [
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: SPACES.SPACE_1.spaceId,
      },
      {
        currentSpaceId: SPACES.SPACE_1.spaceId,
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        currentSpaceId: SPACES.SPACE_1.spaceId,
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      getTest(`can access ${scenario.spaceId} from within the ${scenario.currentSpaceId} space`, {
        spaceId: scenario.spaceId,
        currentSpaceId: scenario.currentSpaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });
    });

    // invalid spaces
    [
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: nonExistantSpaceId,
      },
    ].forEach((scenario) => {
      getTest(`can't access ${scenario.spaceId} from within the ${scenario.currentSpaceId} space`, {
        spaceId: scenario.spaceId,
        currentSpaceId: scenario.currentSpaceId,
        tests: {
          default: {
            statusCode: 404,
            response: createExpectNotFoundResult(),
          },
        },
      });
    });
  });
}
