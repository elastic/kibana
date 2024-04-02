/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';

import type { DownloadSourceSOAttributes } from '../types';

import { DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE } from '../constants';

import { downloadSourceService } from './download_source';
import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';

jest.mock('./app_context');
jest.mock('./agent_policy');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

function mockDownloadSourceSO(id: string, attributes: any = {}) {
  return {
    id,
    type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
    references: [],
    attributes: {
      source_id: id,
      ...attributes,
    },
  };
}

function getMockedSoClient(options: { defaultDownloadSourceId?: string; sameName?: boolean } = {}) {
  const soClient = savedObjectsClientMock.create();

  soClient.get.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case 'download-source-test': {
        return mockDownloadSourceSO('download-source-test', {
          is_default: false,
          name: 'Test',
          host: 'http://test.co',
        });
      }
      case 'existing-default-download-source': {
        return mockDownloadSourceSO('existing-default-download-source', {
          is_default: true,
          name: 'Default host',
          host: 'http://artifacts.co',
        });
      }
      default:
        throw new Error('not found: ' + id);
    }
  });
  soClient.update.mockImplementation(async (type, id, data) => {
    return {
      id,
      type,
      attributes: {},
      references: [],
    };
  });
  soClient.create.mockImplementation(async (type, data, createOptions) => {
    return {
      id: createOptions?.id || 'generated-id',
      type,
      attributes: {},
      references: [],
    };
  });
  soClient.find.mockImplementation(async (findOptions) => {
    if (
      options?.defaultDownloadSourceId &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('is_default') &&
      findOptions.search === 'true'
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClient.get(
              DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
              options.defaultDownloadSourceId
            )),
          },
        ],
        total: 1,
      };
    }

    if (
      options.sameName &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('name') &&
      findOptions
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClient.get(DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE, 'download-source-test')),
          },
        ],
        total: 1,
      };
    }

    return {
      page: 1,
      per_page: 10,
      saved_objects: [],
      total: 0,
    };
  });

  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClient);

  return soClient;
}
let mockedLogger: jest.Mocked<Logger>;
describe('Download Service', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });
  afterEach(() => {
    mockedAgentPolicyService.list.mockClear();
    mockedAgentPolicyService.hasAPMIntegration.mockClear();
    mockedAgentPolicyService.removeDefaultSourceFromAll.mockReset();
    mockedAppContextService.getInternalUserSOClient.mockReset();
  });
  describe('create', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();

      await downloadSourceService.create(
        soClient,
        {
          host: 'http://test.co',
          is_default: false,
          name: 'Test',
        },
        { id: 'download-source-test' }
      );

      expect(soClient.create).toBeCalled();

      // ID should always be the same for a predefined id
      expect(soClient.create.mock.calls[0][2]?.id).toEqual('download-source-test');
      expect((soClient.create.mock.calls[0][1] as DownloadSourceSOAttributes).source_id).toEqual(
        'download-source-test'
      );
    });

    it('should create a new default value if none exists before', async () => {
      const soClient = getMockedSoClient();

      await downloadSourceService.create(
        soClient,
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        },
        { id: 'download-source-test' }
      );

      expect(soClient.update).not.toBeCalled();
    });

    it('should update existing default download source when creating a new default one', async () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.create(soClient, {
        is_default: true,
        name: 'New default host',
        host: 'http://test.co',
      });

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        { is_default: false }
      );
    });
  });

  describe('update', () => {
    it('should update existing default value when updating a download source to become the default one', async () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.update(soClient, 'download-source-test', {
        is_default: true,
        name: 'New default',
        host: 'http://test.co',
      });

      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        {
          is_default: false,
        }
      );
      expect(soClient.update).toBeCalledWith(expect.anything(), 'download-source-test', {
        is_default: true,
        name: 'New default',
        host: 'http://test.co',
      });
    });

    it('should not update existing default when the download source is already the default one', async () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.update(soClient, 'existing-default-download-source', {
        is_default: true,
        name: 'Test',
        host: 'http://test.co',
      });

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        }
      );
    });
  });

  describe('delete', () => {
    it('Call removeDefaultSourceFromAll before deleting the value', async () => {
      const soClient = getMockedSoClient();
      await downloadSourceService.delete(soClient, 'download-source-test');
      expect(mockedAgentPolicyService.removeDefaultSourceFromAll).toBeCalled();
      expect(soClient.delete).toBeCalled();
    });
  });

  describe('get', () => {
    it('works with a predefined id', async () => {
      const soClient = getMockedSoClient();
      const downloadSource = await downloadSourceService.get(soClient, 'download-source-test');

      expect(soClient.get).toHaveBeenCalledWith(
        DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
        'download-source-test'
      );

      expect(downloadSource.id).toEqual('download-source-test');
    });
  });

  describe('getDefaultDownloadSourceId', () => {
    it('works with a predefined id', async () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });
      const defaultId = await downloadSourceService.getDefaultDownloadSourceId(soClient);

      expect(defaultId).toEqual('existing-default-download-source');
    });
  });

  describe('requireUniqueName', () => {
    it('throws an error if the name already exists', () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'download-source-test',
        sameName: true,
      });
      expect(
        async () => await downloadSourceService.requireUniqueName(soClient, { name: 'Test' })
      ).rejects.toThrow(`Download Source 'download-source-test' already exists with name 'Test'`);
    });
    it('does not throw if the name is unique', () => {
      const soClient = getMockedSoClient({
        defaultDownloadSourceId: 'download-source-test',
      });
      expect(
        async () => await downloadSourceService.requireUniqueName(soClient, { name: 'Test' })
      ).not.toThrow();
    });
  });
});
