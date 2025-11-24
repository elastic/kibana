/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../common/lib/authentication';
import { createSpaces, deleteSpaces } from '../../../common/lib/space_test_utils';
import { SPACE_2, SPACES } from '../../../common/lib/spaces';
import { deleteTestSuiteFactory } from '../../../common/suites/delete.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function deleteSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const {
    deleteTest,
    expectRbacForbidden,
    expectEmptyResult,
    expectNotFound,
    expectReservedSpaceResult,
  } = deleteTestSuiteFactory(context);

  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');
  const kbnClient = context.getService('kibanaServer');

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
      await createSpaces(spacesService, isServerless);
      await loadSavedObjects();
    });

    afterEach(async () => {
      try {
        await spacesService.create(SPACE_2);
        await kbnClient.importExport.load(
          `x-pack/platform/test/spaces_api_integration/common/fixtures/kbn_archiver/space_2_objects.json`,
          { space: 'space_2' }
        );
      } catch (error) {
        // Ignore if the space was not deleted
      }
    });

    after(async () => {
      await deleteSpaces(spacesService);
      await unloadSavedObjects();
      await kbnClient.savedObjects.cleanStandardList();
    });
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach((scenario) => {
      deleteTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
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

      deleteTest(`dual-privileges user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
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

      deleteTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });
    });
  });
}
