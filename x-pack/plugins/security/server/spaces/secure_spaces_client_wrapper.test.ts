/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockEnsureAuthorized } from './secure_spaces_client_wrapper.test.mocks';

import { deepFreeze } from '@kbn/std';
import type {
  EcsEventOutcome,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'src/core/server';
import { SavedObjectsErrorHelpers } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import type { GetAllSpacesPurpose, LegacyUrlAliasTarget, Space } from '../../../spaces/server';
import { spacesClientMock } from '../../../spaces/server/mocks';
import type { AuditEvent, AuditLogger } from '../audit';
import { SavedObjectAction, SpaceAuditAction } from '../audit';
import { auditLoggerMock } from '../audit/mocks';
import type {
  AuthorizationServiceSetup,
  AuthorizationServiceSetupInternal,
} from '../authorization';
import { authorizationMock } from '../authorization/index.mock';
import type { CheckPrivilegesResponse } from '../authorization/types';
import {
  getAliasId,
  LEGACY_URL_ALIAS_TYPE,
  SecureSpacesClientWrapper,
} from './secure_spaces_client_wrapper';

interface Opts {
  securityEnabled?: boolean;
}

const spaces = deepFreeze([
  {
    id: 'default',
    name: 'Default Space',
    disabledFeatures: [],
  },
  {
    id: 'marketing',
    name: 'Marketing Space',
    disabledFeatures: [],
  },
  {
    id: 'sales',
    name: 'Sales Space',
    disabledFeatures: [],
  },
]) as unknown as Space[];

const setup = ({ securityEnabled = false }: Opts = {}) => {
  const baseClient = spacesClientMock.create();
  baseClient.getAll.mockResolvedValue([...spaces]);

  baseClient.get.mockImplementation(async (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('space', spaceId);
    }
    return space;
  });

  baseClient.createSavedObjectFinder.mockImplementation(() => ({
    async *find() {
      yield {
        saved_objects: [
          {
            namespaces: ['*'],
            type: 'dashboard',
            id: '1',
          },
          {
            namespaces: ['existing_space'],
            type: 'dashboard',
            id: '2',
          },
          {
            namespaces: ['default', 'existing_space'],
            type: 'dashboard',
            id: '3',
          },
        ],
      } as SavedObjectsFindResponse<unknown, unknown>;
    },
    async close() {},
  }));

  const authorization = authorizationMock.create({
    version: 'unit-test',
    applicationName: 'kibana',
  });
  authorization.mode.useRbacForRequest.mockReturnValue(securityEnabled);

  const auditLogger = auditLoggerMock.create();

  const request = httpServerMock.createKibanaRequest();

  const forbiddenError = new Error('Mock ForbiddenError');
  const errors = {
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    // other errors exist but are not needed for these test cases
  } as unknown as jest.Mocked<SavedObjectsClientContract['errors']>;

  const wrapper = new SecureSpacesClientWrapper(
    baseClient,
    request,
    authorization,
    auditLogger,
    errors
  );
  return {
    authorization,
    wrapper,
    request,
    baseClient,
    auditLogger,
    forbiddenError,
  };
};

const expectNoAuthorizationCheck = (
  authorization: jest.Mocked<AuthorizationServiceSetupInternal>
) => {
  expect(authorization.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
  expect(authorization.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  expect(authorization.checkSavedObjectsPrivilegesWithRequest).not.toHaveBeenCalled();
};

const expectAuditEvent = (
  auditLogger: AuditLogger,
  action: string,
  outcome: EcsEventOutcome,
  savedObject?: Required<AuditEvent>['kibana']['saved_object']
) => {
  expect(auditLogger.log).toHaveBeenCalledWith(
    expect.objectContaining({
      event: expect.objectContaining({
        action,
        outcome,
      }),
      kibana: savedObject
        ? expect.objectContaining({
            saved_object: savedObject,
          })
        : expect.anything(),
    })
  );
};

beforeEach(() => {
  mockEnsureAuthorized.mockReset();
});

describe('SecureSpacesClientWrapper', () => {
  describe('#getAll', () => {
    const savedObjects = [
      {
        id: 'default',
        attributes: {
          name: 'foo-name',
          description: 'foo-description',
          bar: 'foo-bar',
        },
      },
      {
        id: 'marketing',
        attributes: {
          name: 'bar-name',
          description: 'bar-description',
          bar: 'bar-bar',
        },
      },
      {
        id: 'sales',
        attributes: {
          name: 'bar-name',
          description: 'bar-description',
          bar: 'bar-bar',
        },
      },
    ];

    it('delegates to base client when security is not enabled', async () => {
      const { wrapper, baseClient, authorization, auditLogger } = setup({
        securityEnabled: false,
      });

      const response = await wrapper.getAll();
      expect(baseClient.getAll).toHaveBeenCalledTimes(1);
      expect(baseClient.getAll).toHaveBeenCalledWith({ purpose: 'any' });
      expect(response).toEqual(spaces);
      expectNoAuthorizationCheck(authorization);
      expectAuditEvent(auditLogger, SpaceAuditAction.FIND, 'success', {
        type: 'space',
        id: spaces[0].id,
      });
      expectAuditEvent(auditLogger, SpaceAuditAction.FIND, 'success', {
        type: 'space',
        id: spaces[1].id,
      });
      expectAuditEvent(auditLogger, SpaceAuditAction.FIND, 'success', {
        type: 'space',
        id: spaces[2].id,
      });
    });

    [
      {
        purpose: undefined,
        expectedPrivilege: (mockAuthorization: AuthorizationServiceSetup) => [
          mockAuthorization.actions.login,
        ],
      },
      {
        purpose: 'any' as GetAllSpacesPurpose,
        expectedPrivilege: (mockAuthorization: AuthorizationServiceSetup) => [
          mockAuthorization.actions.login,
        ],
      },
      {
        purpose: 'copySavedObjectsIntoSpace' as GetAllSpacesPurpose,
        expectedPrivilege: (mockAuthorization: AuthorizationServiceSetup) => [
          mockAuthorization.actions.ui.get('savedObjectsManagement', 'copyIntoSpace'),
        ],
      },
      {
        purpose: 'findSavedObjects' as GetAllSpacesPurpose,
        expectedPrivilege: (mockAuthorization: AuthorizationServiceSetup) => [
          mockAuthorization.actions.login,
          mockAuthorization.actions.savedObject.get('config', 'find'),
        ],
      },
      {
        purpose: 'shareSavedObjectsIntoSpace' as GetAllSpacesPurpose,
        expectedPrivilege: (mockAuthorization: AuthorizationServiceSetup) => [
          mockAuthorization.actions.ui.get('savedObjectsManagement', 'shareIntoSpace'),
        ],
      },
    ].forEach((scenario) => {
      describe(`with purpose='${scenario.purpose}'`, () => {
        test(`throws Boom.forbidden when user isn't authorized for any spaces`, async () => {
          const username = 'some-user';
          const { authorization, wrapper, baseClient, request, auditLogger } = setup({
            securityEnabled: true,
          });

          const privileges = scenario.expectedPrivilege(authorization);

          const checkPrivileges = jest.fn().mockResolvedValue({
            username,
            privileges: {
              kibana: [
                ...privileges
                  .map((privilege) => [
                    { resource: savedObjects[0].id, privilege, authorized: false },
                    { resource: savedObjects[1].id, privilege, authorized: false },
                  ])
                  .flat(),
              ],
            },
          } as CheckPrivilegesResponse);
          authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces: checkPrivileges });

          await expect(wrapper.getAll({ purpose: scenario.purpose })).rejects.toThrowError(
            'Forbidden'
          );

          expect(baseClient.getAll).toHaveBeenCalledWith({ purpose: scenario.purpose ?? 'any' });
          expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(checkPrivileges).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            { kibana: privileges }
          );

          expectAuditEvent(auditLogger, SpaceAuditAction.FIND, 'failure');
        });

        test(`returns spaces that the user is authorized for`, async () => {
          const username = 'some-user';
          const { authorization, wrapper, baseClient, request, auditLogger } = setup({
            securityEnabled: true,
          });

          const privileges = scenario.expectedPrivilege(authorization);

          const checkPrivileges = jest.fn().mockResolvedValue({
            username,
            privileges: {
              kibana: [
                ...privileges
                  .map((privilege) => [
                    { resource: savedObjects[0].id, privilege, authorized: true },
                    { resource: savedObjects[1].id, privilege, authorized: false },
                  ])
                  .flat(),
              ],
            },
          } as CheckPrivilegesResponse);
          authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces: checkPrivileges });

          const actualSpaces = await wrapper.getAll({ purpose: scenario.purpose });

          expect(actualSpaces).toEqual([spaces[0]]);
          expect(baseClient.getAll).toHaveBeenCalledWith({ purpose: scenario.purpose ?? 'any' });
          expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
          expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
          expect(checkPrivileges).toHaveBeenCalledWith(
            savedObjects.map((savedObject) => savedObject.id),
            { kibana: privileges }
          );

          expectAuditEvent(auditLogger, SpaceAuditAction.FIND, 'success', {
            type: 'space',
            id: spaces[0].id,
          });
        });
      });
    });
  });

  describe('#get', () => {
    it('delegates to base client when security is not enabled', async () => {
      const { wrapper, baseClient, authorization, auditLogger } = setup({
        securityEnabled: false,
      });

      const response = await wrapper.get('default');
      expect(baseClient.get).toHaveBeenCalledTimes(1);
      expect(baseClient.get).toHaveBeenCalledWith('default');
      expect(response).toEqual(spaces[0]);
      expectNoAuthorizationCheck(authorization);
      expectAuditEvent(auditLogger, SpaceAuditAction.GET, 'success', {
        type: 'space',
        id: spaces[0].id,
      });
    });

    test(`throws a forbidden error when unauthorized`, async () => {
      const username = 'some_user';
      const spaceId = 'default';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: false,
        privileges: {
          kibana: [
            { resource: spaceId, privilege: authorization.actions.login, authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpace: checkPrivileges });

      await expect(wrapper.get(spaceId)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to get default space"`
      );

      expect(baseClient.get).not.toHaveBeenCalled();

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith(spaceId, {
        kibana: authorization.actions.login,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.GET, 'failure', {
        type: 'space',
        id: spaces[0].id,
      });
    });

    it('returns the space when authorized', async () => {
      const username = 'some_user';
      const spaceId = 'default';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: true,
        privileges: {
          kibana: [{ resource: spaceId, privilege: authorization.actions.login, authorized: true }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpace: checkPrivileges });

      const response = await wrapper.get(spaceId);

      expect(baseClient.get).toHaveBeenCalledTimes(1);
      expect(baseClient.get).toHaveBeenCalledWith(spaceId);

      expect(response).toEqual(spaces[0]);

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith(spaceId, {
        kibana: authorization.actions.login,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.GET, 'success', {
        type: 'space',
        id: spaceId,
      });
    });
  });

  describe('#create', () => {
    const space = Object.freeze({
      id: 'new_space',
      name: 'new space',
      disabledFeatures: [],
    });

    it('delegates to base client when security is not enabled', async () => {
      const { wrapper, baseClient, authorization, auditLogger } = setup({
        securityEnabled: false,
      });

      const response = await wrapper.create(space);
      expect(baseClient.create).toHaveBeenCalledTimes(1);
      expect(baseClient.create).toHaveBeenCalledWith(space);
      expect(response).toEqual(space);
      expectNoAuthorizationCheck(authorization);
      expectAuditEvent(auditLogger, SpaceAuditAction.CREATE, 'unknown', {
        type: 'space',
        id: space.id,
      });
    });

    test(`throws a forbidden error when unauthorized`, async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: false,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: false }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      await expect(wrapper.create(space)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create spaces"`
      );

      expect(baseClient.create).not.toHaveBeenCalled();

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.CREATE, 'failure', {
        type: 'space',
        id: space.id,
      });
    });

    it('creates the space when authorized', async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: true,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: true }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      const response = await wrapper.create(space);

      expect(baseClient.create).toHaveBeenCalledTimes(1);
      expect(baseClient.create).toHaveBeenCalledWith(space);

      expect(response).toEqual(space);

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.CREATE, 'unknown', {
        type: 'space',
        id: space.id,
      });
    });
  });

  describe('#update', () => {
    const space = Object.freeze({
      id: 'existing_space',
      name: 'existing space',
      disabledFeatures: [],
    });

    it('delegates to base client when security is not enabled', async () => {
      const { wrapper, baseClient, authorization, auditLogger } = setup({
        securityEnabled: false,
      });

      const response = await wrapper.update(space.id, space);
      expect(baseClient.update).toHaveBeenCalledTimes(1);
      expect(baseClient.update).toHaveBeenCalledWith(space.id, space);
      expect(response).toEqual(space.id);
      expectNoAuthorizationCheck(authorization);
      expectAuditEvent(auditLogger, SpaceAuditAction.UPDATE, 'unknown', {
        type: 'space',
        id: space.id,
      });
    });

    test(`throws a forbidden error when unauthorized`, async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: false,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: false }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      await expect(wrapper.update(space.id, space)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to update spaces"`
      );

      expect(baseClient.update).not.toHaveBeenCalled();

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.UPDATE, 'failure', {
        type: 'space',
        id: space.id,
      });
    });

    it('updates the space when authorized', async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: true,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: true }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      const response = await wrapper.update(space.id, space);

      expect(baseClient.update).toHaveBeenCalledTimes(1);
      expect(baseClient.update).toHaveBeenCalledWith(space.id, space);

      expect(response).toEqual(space.id);

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.UPDATE, 'unknown', {
        type: 'space',
        id: space.id,
      });
    });
  });

  describe('#delete', () => {
    const space = Object.freeze({
      id: 'existing_space',
      name: 'existing space',
      disabledFeatures: [],
    });

    it('delegates to base client when security is not enabled', async () => {
      const { wrapper, baseClient, authorization, auditLogger } = setup({
        securityEnabled: false,
      });

      await wrapper.delete(space.id);
      expect(baseClient.delete).toHaveBeenCalledTimes(1);
      expect(baseClient.delete).toHaveBeenCalledWith(space.id);
      expectNoAuthorizationCheck(authorization);
      expectAuditEvent(auditLogger, SpaceAuditAction.DELETE, 'unknown', {
        type: 'space',
        id: space.id,
      });
    });

    it(`throws a forbidden error when unauthorized`, async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: false,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: false }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      await expect(wrapper.delete(space.id)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to delete spaces"`
      );

      expect(baseClient.delete).not.toHaveBeenCalled();

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.DELETE, 'failure', {
        type: 'space',
        id: space.id,
      });
    });

    it('deletes the space with all saved objects when authorized', async () => {
      const username = 'some_user';

      const { wrapper, baseClient, authorization, auditLogger, request } = setup({
        securityEnabled: true,
      });

      const checkPrivileges = jest.fn().mockResolvedValue({
        username,
        hasAllRequested: true,
        privileges: {
          kibana: [{ privilege: authorization.actions.space.manage, authorized: true }],
        },
      } as CheckPrivilegesResponse);
      authorization.checkPrivilegesWithRequest.mockReturnValue({ globally: checkPrivileges });

      await wrapper.delete(space.id);

      expect(baseClient.delete).toHaveBeenCalledTimes(1);
      expect(baseClient.delete).toHaveBeenCalledWith(space.id);

      expect(authorization.mode.useRbacForRequest).toHaveBeenCalledWith(request);
      expect(authorization.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: authorization.actions.space.manage,
      });

      expectAuditEvent(auditLogger, SpaceAuditAction.DELETE, 'unknown', {
        type: 'space',
        id: space.id,
      });
      expectAuditEvent(auditLogger, SavedObjectAction.DELETE, 'unknown', {
        type: 'dashboard',
        id: '2',
      });
      expectAuditEvent(auditLogger, SavedObjectAction.UPDATE_OBJECTS_SPACES, 'unknown', {
        type: 'dashboard',
        id: '3',
      });
    });
  });

  describe('#disableLegacyUrlAliases', () => {
    const alias1 = { targetSpace: 'space-1', targetType: 'type-1', sourceId: 'id' };
    const alias2 = { targetSpace: 'space-2', targetType: 'type-2', sourceId: 'id' };

    function expectAuditEvents(
      auditLogger: AuditLogger,
      aliases: LegacyUrlAliasTarget[],
      action: EcsEventOutcome
    ) {
      aliases.forEach((alias) => {
        expectAuditEvent(auditLogger, SavedObjectAction.UPDATE, action, {
          type: LEGACY_URL_ALIAS_TYPE,
          id: getAliasId(alias),
        });
      });
    }

    function expectAuthorizationCheck(targetTypes: string[], targetSpaces: string[]) {
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledWith(
        expect.any(Object), // dependencies
        targetTypes, // unique types of the alias targets
        ['bulk_update'], // actions
        targetSpaces, // unique spaces of the alias targets
        { requireFullAuthorization: false }
      );
    }

    describe('when security is not enabled', () => {
      const securityEnabled = false;

      it('delegates to base client without checking authorization', async () => {
        const { wrapper, baseClient, auditLogger } = setup({ securityEnabled });
        const aliases = [alias1];
        await wrapper.disableLegacyUrlAliases(aliases);

        expect(mockEnsureAuthorized).not.toHaveBeenCalled();
        expectAuditEvents(auditLogger, aliases, 'unknown');
        expect(baseClient.disableLegacyUrlAliases).toHaveBeenCalledTimes(1);
        expect(baseClient.disableLegacyUrlAliases).toHaveBeenCalledWith(aliases);
      });
    });

    describe('when security is enabled', () => {
      const securityEnabled = true;

      it('re-throws the error if the authorization check fails', async () => {
        const error = new Error('Oh no!');
        mockEnsureAuthorized.mockRejectedValue(error);
        const { wrapper, baseClient, auditLogger } = setup({ securityEnabled });
        const aliases = [alias1, alias2];
        await expect(() => wrapper.disableLegacyUrlAliases(aliases)).rejects.toThrow(error);

        expectAuthorizationCheck(['type-1', 'type-2'], ['space-1', 'space-2']);
        expectAuditEvents(auditLogger, aliases, 'failure');
        expect(baseClient.disableLegacyUrlAliases).not.toHaveBeenCalled();
      });

      it('throws a forbidden error when unauthorized', async () => {
        mockEnsureAuthorized.mockResolvedValue({
          status: 'partially_authorized',
          typeActionMap: new Map()
            .set('type-1', { bulk_update: { authorizedSpaces: ['space-1'] } })
            .set('type-2', { bulk_update: { authorizedSpaces: ['space-1'] } }), // the user is not authorized to bulkUpdate type-2 in space-2, so this will throw a forbidden error
        });
        const { wrapper, baseClient, auditLogger, forbiddenError } = setup({ securityEnabled });
        const aliases = [alias1, alias2];
        await expect(() => wrapper.disableLegacyUrlAliases(aliases)).rejects.toThrow(
          forbiddenError
        );

        expectAuthorizationCheck(['type-1', 'type-2'], ['space-1', 'space-2']);
        expectAuditEvents(auditLogger, aliases, 'failure');
        expect(baseClient.disableLegacyUrlAliases).not.toHaveBeenCalled();
      });

      it('updates the legacy URL aliases when authorized', async () => {
        mockEnsureAuthorized.mockResolvedValue({
          status: 'partially_authorized',
          typeActionMap: new Map()
            .set('type-1', { bulk_update: { authorizedSpaces: ['space-1'] } })
            .set('type-2', { bulk_update: { authorizedSpaces: ['space-2'] } }),
        });
        const { wrapper, baseClient, auditLogger } = setup({ securityEnabled });
        const aliases = [alias1, alias2];
        await wrapper.disableLegacyUrlAliases(aliases);

        expectAuthorizationCheck(['type-1', 'type-2'], ['space-1', 'space-2']);
        expectAuditEvents(auditLogger, aliases, 'unknown');
        expect(baseClient.disableLegacyUrlAliases).toHaveBeenCalledTimes(1);
        expect(baseClient.disableLegacyUrlAliases).toHaveBeenCalledWith(aliases);
      });
    });
  });
});
