/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../common/lib/authentication';
import { createSpaces, deleteSpaces } from '../../../common/lib/space_test_utils';
import { SPACES } from '../../../common/lib/spaces';
import { updateTestSuiteFactory } from '../../../common/suites/update.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function updateSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const {
    updateTest,
    expectNotFound,
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectRbacForbidden,
  } = updateTestSuiteFactory(context);

  const spacesService = context.getService('spaces');
  const isServerless = context.getService('config').get('serverless');

  describe('update', () => {
    before(async () => {
      await createSpaces(spacesService, isServerless);
    });

    after(async () => {
      await deleteSpaces(spacesService);
    });
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
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
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach((scenario) => {
      updateTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
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

      updateTest(`dual-privileges used from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
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

      updateTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with read at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readAtSpace,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });
    });
  });
}
