/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDeprecationsContext, IScopedClusterClient } from 'kibana/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { ReportingCore } from '..';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockReportingCore,
} from '../test_helpers';
import { getDeprecationsInfo } from './reporting_role';

let reportingCore: ReportingCore;
let context: GetDeprecationsContext;
let esClient: jest.Mocked<IScopedClusterClient>;

beforeEach(async () => {
  reportingCore = await createMockReportingCore(
    createMockConfigSchema({ roles: { enabled: false } })
  );

  esClient = elasticsearchServiceMock.createScopedClusterClient();
  esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
    xyz: { username: 'normal_user', roles: ['data_analyst'] },
  });
  esClient.asCurrentUser.security.getRoleMapping = jest.fn().mockResolvedValue({});

  context = { esClient } as unknown as GetDeprecationsContext;
});

test('logs no deprecations when setup has no issues', async () => {
  expect(await getDeprecationsInfo(context, { reportingCore })).toMatchInlineSnapshot(`Array []`);
});

describe('users assigned to a deprecated role', () => {
  test('logs a deprecation when a user was found with a deprecated reporting_user role', async () => {
    esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
      reportron: {
        username: 'reportron',
        roles: ['kibana_admin', 'reporting_user'],
      },
    });

    reportingCore = await createMockReportingCore(createMockConfigSchema());

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });

  test('logs a deprecation when a user was found with a deprecated custom role from the roles.allow setting', async () => {
    reportingCore = await createMockReportingCore(
      createMockConfigSchema({ roles: { allow: ['my_test_reporting_user'] } })
    );
    esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
      reportron: { username: 'reportron', roles: ['kibana_admin', 'my_test_reporting_user'] },
    });

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });

  test('includes steps to remove the incompatible config, when applicable', async () => {
    esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
      reportron: {
        username: 'reportron',
        roles: ['kibana_admin', 'reporting_user'],
      },
    });

    reportingCore = await createMockReportingCore(
      createMockConfigSchema({ roles: { enabled: true } })
    );

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });
});

describe('roles mapped to a deprecated role', () => {
  test('logs a deprecation when a role was found that maps to the deprecated reporting_user role', async () => {
    esClient.asCurrentUser.security.getRoleMapping = jest
      .fn()
      .mockResolvedValue({ dungeon_master: { roles: ['reporting_user'] } });

    reportingCore = await createMockReportingCore(createMockConfigSchema());

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });

  test('logs a deprecation when a role was found that maps to a deprecated custom role from the roles.allow setting', async () => {
    reportingCore = await createMockReportingCore(
      createMockConfigSchema({ roles: { allow: ['my_test_reporting_user'] } })
    );
    esClient.asCurrentUser.security.getRoleMapping = jest
      .fn()
      .mockResolvedValue({ dungeon_master: { roles: ['my_test_reporting_user'] } });

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });

  test('includes steps to remove the incompatible config, when applicable', async () => {
    esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
      reportron: {
        username: 'reportron',
        roles: ['kibana_admin', 'reporting_user'],
      },
    });

    reportingCore = await createMockReportingCore(
      createMockConfigSchema({ roles: { enabled: true } })
    );

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchSnapshot();
  });
});

describe('check deprecations when security is disabled', () => {
  test('logs no deprecations: roles not enabled', async () => {
    reportingCore = await createMockReportingCore(
      createMockConfigSchema({ roles: { enabled: false } }),
      createMockPluginSetup({ security: null })
    );
    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchInlineSnapshot(`Array []`);
  });

  test('logs no deprecations: roles enabled', async () => {
    const mockReportingConfig = createMockConfigSchema(); // roles.enabled: true is default in 7.x / 8.0
    reportingCore = await createMockReportingCore(
      mockReportingConfig,
      createMockPluginSetup({ security: null })
    );

    expect(await getDeprecationsInfo(context, { reportingCore })).toMatchInlineSnapshot(`Array []`);
  });
});

it('insufficient permissions', async () => {
  const permissionsError = new Error('you shall not pass');
  (permissionsError as unknown as { statusCode: number }).statusCode = 403;
  esClient.asCurrentUser.security.getUser = jest.fn().mockRejectedValue(permissionsError);
  esClient.asCurrentUser.security.getRoleMapping = jest.fn().mockRejectedValue(permissionsError);

  expect(await getDeprecationsInfo(context, { reportingCore })).toMatchInlineSnapshot(`
    Array [
      Object {
        "correctiveActions": Object {
          "manualSteps": Array [
            "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
          ],
        },
        "deprecationType": "feature",
        "documentationUrl": "https://www.elastic.co/guide/en/kibana/current/xpack-security.html#_required_permissions_7",
        "level": "fetch_error",
        "message": "You do not have enough permissions to fix this deprecation.",
        "title": "The \\"reporting_user\\" role is deprecated: check user roles",
      },
      Object {
        "correctiveActions": Object {
          "manualSteps": Array [
            "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
          ],
        },
        "deprecationType": "feature",
        "documentationUrl": "https://www.elastic.co/guide/en/kibana/current/xpack-security.html#_required_permissions_7",
        "level": "fetch_error",
        "message": "You do not have enough permissions to fix this deprecation.",
        "title": "The \\"reporting_user\\" role is deprecated: check role mappings",
      },
    ]
  `);
});
