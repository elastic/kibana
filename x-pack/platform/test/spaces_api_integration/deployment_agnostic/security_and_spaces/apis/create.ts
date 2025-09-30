/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../../common/lib/authentication';
import { SPACE_1, SPACE_2, SPACE_3, SPACES } from '../../../common/lib/spaces';
import { createTestSuiteFactory } from '../../../common/suites/create.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function createSpacesOnlySuite(context: DeploymentAgnosticFtrProviderContext) {
  const {
    createTest,
    expectNewSpaceResult,
    expectReservedSpecifiedResult,
    expectConflictResponse,
    expectRbacForbiddenResponse,
    expectSolutionSpecifiedResult,
  } = createTestSuiteFactory(context);

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

  describe('create', () => {
    before(async () => {
      await createSpaces();
    });

    after(async () => {
      await deleteSpaces();
    });

    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
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
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach((scenario) => {
      createTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          solutionSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });

      createTest(`superuser from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
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
      createTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
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

      createTest(`dual-privileges user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
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

      createTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          solutionSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });
      createTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          solutionSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });

      createTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          solutionSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });

      createTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          solutionSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });
    });
  });
}
