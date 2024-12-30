/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext, IScopedClusterClient, CoreSetup } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getDeprecationsInfo } from './apm_user_role';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

let context: GetDeprecationsContext;
let esClient: jest.Mocked<IScopedClusterClient>;
const core = { docLinks: { version: 'main' } } as unknown as CoreSetup;
const logger = loggingSystemMock.createLogger();
const security = { license: { isEnabled: () => true } } as unknown as SecurityPluginSetup;

describe('apm_user deprecation', () => {
  beforeEach(async () => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
      xyz: { username: 'normal_user', roles: ['data_analyst'] },
    });
    esClient.asCurrentUser.security.getRoleMapping = jest.fn().mockResolvedValue({});

    context = { esClient } as unknown as GetDeprecationsContext;
  });

  test('logs no deprecations when setup has no issues', async () => {
    expect(await getDeprecationsInfo(context, core, { logger, security })).toMatchInlineSnapshot(
      `Array []`
    );
  });

  describe('users assigned to a removed role', () => {
    test('logs a deprecation when a user was found with a removed apm_user role', async () => {
      esClient.asCurrentUser.security.getUser = jest.fn().mockResolvedValue({
        foo: {
          username: 'foo',
          roles: ['kibana_admin', 'apm_user'],
        },
      });

      expect(await getDeprecationsInfo(context, core, { logger, security })).toMatchSnapshot();
    });
  });

  describe('roles mapped to a removed role', () => {
    test('logs a deprecation when a role was found that maps to the removed apm_user role', async () => {
      esClient.asCurrentUser.security.getRoleMapping = jest
        .fn()
        .mockResolvedValue({ dungeon_master: { roles: ['apm_user'] } });

      expect(await getDeprecationsInfo(context, core, { logger, security })).toMatchSnapshot();
    });
  });

  describe('check deprecations when security is disabled', () => {
    test('logs no deprecations', async () => {
      expect(
        await getDeprecationsInfo(context, core, { logger, security: undefined })
      ).toMatchInlineSnapshot(`Array []`);
    });
  });

  it('insufficient permissions', async () => {
    const permissionsError = new Error('you shall not pass');
    (permissionsError as unknown as { statusCode: number }).statusCode = 403;
    esClient.asCurrentUser.security.getUser = jest.fn().mockRejectedValue(permissionsError);
    esClient.asCurrentUser.security.getRoleMapping = jest.fn().mockRejectedValue(permissionsError);

    expect(await getDeprecationsInfo(context, core, { logger, security })).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
            ],
          },
          "deprecationType": "feature",
          "documentationUrl": "https://www.elastic.co/guide/en/kibana/main/xpack-security.html#_required_permissions_7",
          "level": "fetch_error",
          "message": "You do not have enough permissions to fix this deprecation.",
          "title": "Check for users assigned the deprecated \\"apm_user\\" role",
        },
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
            ],
          },
          "deprecationType": "feature",
          "documentationUrl": "https://www.elastic.co/guide/en/kibana/main/xpack-security.html#_required_permissions_7",
          "level": "fetch_error",
          "message": "You do not have enough permissions to fix this deprecation.",
          "title": "Check for role mappings using the deprecated \\"apm_user\\" role",
        },
      ]
    `);
  });
});
