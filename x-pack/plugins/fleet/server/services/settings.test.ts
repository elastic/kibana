/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import Boom from '@hapi/boom';

import { GLOBAL_SETTINGS_ID, GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '../../common/constants';

import type { Settings } from '../types';

import { DeleteUnenrolledAgentsPreconfiguredError } from '../errors';

import { appContextService } from './app_context';
import { getSettings, saveSettings, settingsSetup } from './settings';
import { auditLoggingService } from './audit_logging';
import { listFleetServerHosts } from './fleet_server_host';

jest.mock('./app_context');
jest.mock('./audit_logging');
jest.mock('./fleet_server_host');

const mockListFleetServerHosts = listFleetServerHosts as jest.MockedFunction<
  typeof listFleetServerHosts
>;
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

describe('settingsSetup', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
    mockedAppContextService.getConfig.mockReset();
  });
  it('should create settings if there is no settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 0,
      page: 0,
      per_page: 10,
      saved_objects: [],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).toBeCalled();
  });

  it('should do nothing if there is settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 1,
      page: 0,
      per_page: 10,
      saved_objects: [
        {
          id: 'defaultsettings',
          attributes: {},
          type: 'so_type',
          references: [],
          score: 0,
        },
      ],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).not.toBeCalled();
  });
});

describe('getSettings', () => {
  it('should call audit logger', async () => {
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          attributes: {},
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          score: 0,
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    });

    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    await getSettings(soClient);
  });

  it('should handle null values for space awareness migration fields', async () => {
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          attributes: {
            use_space_awareness_migration_status: null,
            use_space_awareness_migration_started_at: null,
          },
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          score: 0,
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    });

    const settings = await getSettings(soClient);
    expect(settings).toEqual({
      delete_unenrolled_agents: undefined,
      has_seen_add_data_notice: undefined,
      id: 'fleet-default-settings',
      output_secret_storage_requirements_met: undefined,
      preconfigured_fields: [],
      prerelease_integrations_enabled: undefined,
      secret_storage_requirements_met: undefined,
      use_space_awareness_migration_started_at: undefined,
      use_space_awareness_migration_status: undefined,
      version: undefined,
    });
  });
});

describe('saveSettings', () => {
  describe('when settings object exists', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      const newData: Partial<Omit<Settings, 'id'>> = {
        output_secret_storage_requirements_met: true,
      };

      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: GLOBAL_SETTINGS_ID,
            attributes: {},
            references: [],
            type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
            score: 0,
          },
        ],
        page: 1,
        per_page: 10,
        total: 1,
      });

      soClient.update.mockResolvedValueOnce({
        id: GLOBAL_SETTINGS_ID,
        attributes: {},
        references: [],
        type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });

      mockListFleetServerHosts.mockResolvedValueOnce({
        items: [
          {
            id: 'fleet-server-host',
            name: 'Fleet Server Host',
            is_default: true,
            is_preconfigured: false,
            host_urls: ['http://localhost:8220'],
          },
        ],
        page: 1,
        perPage: 10,
        total: 1,
      });

      await saveSettings(soClient, newData);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: GLOBAL_SETTINGS_ID,
        savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      });
    });

    describe('when settings object does not exist', () => {
      it('should call audit logger', async () => {
        const soClient = savedObjectsClientMock.create();

        const newData: Partial<Omit<Settings, 'id'>> = {
          output_secret_storage_requirements_met: true,
        };

        soClient.find.mockRejectedValueOnce(Boom.notFound('not found'));

        soClient.create.mockResolvedValueOnce({
          id: GLOBAL_SETTINGS_ID,
          attributes: {},
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        });

        await saveSettings(soClient, newData);

        expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
          action: 'create',
          id: GLOBAL_SETTINGS_ID,
          savedObjectType: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        });
      });
    });
  });

  it('should allow updating preconfigured setting if called from setup', async () => {
    const soClient = savedObjectsClientMock.create();

    const newData: Partial<Omit<Settings, 'id'>> = {
      delete_unenrolled_agents: {
        enabled: true,
        is_preconfigured: true,
      },
    };

    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          attributes: {
            delete_unenrolled_agents: {
              enabled: false,
              is_preconfigured: true,
            },
          },
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          score: 0,
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    });
    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    soClient.update.mockResolvedValueOnce({
      id: GLOBAL_SETTINGS_ID,
      attributes: {},
      references: [],
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    });

    await saveSettings(soClient, newData, { fromSetup: true });

    expect(soClient.update).toHaveBeenCalled();
  });

  it('should not allow updating preconfigured setting if not called from setup', async () => {
    const soClient = savedObjectsClientMock.create();

    const newData: Partial<Omit<Settings, 'id'>> = {
      delete_unenrolled_agents: {
        enabled: true,
        is_preconfigured: true,
      },
    };

    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          attributes: {
            delete_unenrolled_agents: {
              enabled: false,
              is_preconfigured: true,
            },
          },
          references: [],
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          score: 0,
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    });
    mockListFleetServerHosts.mockResolvedValueOnce({
      items: [
        {
          id: 'fleet-server-host',
          name: 'Fleet Server Host',
          is_default: true,
          is_preconfigured: false,
          host_urls: ['http://localhost:8220'],
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });

    soClient.update.mockResolvedValueOnce({
      id: GLOBAL_SETTINGS_ID,
      attributes: {},
      references: [],
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    });

    try {
      await saveSettings(soClient, newData);
      fail('Expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(DeleteUnenrolledAgentsPreconfiguredError);
    }
  });
});
