/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACE_1, SPACE_2, SPACE_3, SPACES } from '../../../common/lib/spaces';
import { deleteTestSuiteFactory } from '../../../common/suites/delete.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function deleteSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { deleteTest, expectEmptyResult, expectReservedSpaceResult, expectNotFound } =
    deleteTestSuiteFactory(context);

  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');
  const kbnClient = context.getService('kibanaServer');

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

  const loadSavedObjects = async () => {
    for (const space of ['default', 'space_1', 'space_2', 'space_3', 'other_space']) {
      await kbnClient.importExport.load(
        `x-pack/platform/test/spaces_api_integration/common/fixtures/kbn_archiver/${space}_objects.json`,
        { space }
      );
    }
  };

  const unloadSavedObjects = async () => {
    for (const space of ['default', 'space_1', 'space_2', 'space_3', 'other_space']) {
      await kbnClient.importExport.unload(
        `x-pack/platform/test/spaces_api_integration/common/fixtures/kbn_archiver/${space}_objects.json`,
        { space }
      );
    }
  };

  describe('delete', () => {
    before(async () => {
      await createSpaces();
      await loadSavedObjects();
    });

    afterEach(async () => {
      try {
        await spacesService.create(SPACE_2);
      } catch (error) {
        // Ignore
      }
    });

    after(async () => {
      await deleteSpaces();
      await unloadSavedObjects();
      await kbnClient.savedObjects.cleanStandardList();
    });

    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      deleteTest(`from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          exists: {
            statusCode: 204,
            response: expectEmptyResult,
          },
          reservedSpace: {
            statusCode: 400,
            response: expectReservedSpaceResult,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });
    });
  });
}
