/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACE_1, SPACE_2, SPACE_3, SPACES } from '../../../common/lib/spaces';
import { updateTestSuiteFactory } from '../../../common/suites/update.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function updateSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { updateTest, expectAlreadyExistsResult, expectDefaultSpaceResult, expectNotFound } =
    updateTestSuiteFactory(context);
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

  describe('update', () => {
    before(async () => {
      await createSpaces();
    });
    after(async () => {
      await deleteSpaces();
    });

    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      updateTest(`can update from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          alreadyExists: {
            statusCode: 200,
            response: expectAlreadyExistsResult,
          },
          defaultSpace: {
            statusCode: 200,
            response: expectDefaultSpaceResult,
          },
          newSpace: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });
    });
  });
}
