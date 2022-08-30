/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE } from '../../constants';

import type { AgentPolicy, DownloadSource } from '../../types';

import { getSourceUriForAgentPolicy } from './source_uri_utils';

const soClientMock = savedObjectsClientMock.create();

jest.mock('../download_source', () => {
  return {
    downloadSourceService: {
      getDefaultDownloadSourceId: async () => 'default-download-source-id',
      get: async (soClient: any, id: string): Promise<DownloadSource> => {
        if (id === 'test-ds-1') {
          return {
            id: 'test-ds-1',
            is_default: false,
            name: 'Test',
            host: 'http://custom-registry-test',
          };
        }
        return {
          id: 'default-download-source-id',
          is_default: true,
          name: 'Default host',
          host: 'http://default-registry.co',
        };
      },
    },
  };
});

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
describe('helpers', () => {
  beforeEach(() => {
    soClientMock.get.mockImplementation(async (type: string, id: string) => {
      switch (id) {
        case 'test-ds-1': {
          return mockDownloadSourceSO('test-ds-1', {
            is_default: false,
            name: 'Test',
            host: 'http://custom-registry-test',
          });
        }
        case 'default-download-source-id': {
          return mockDownloadSourceSO('default-download-source-id', {
            is_default: true,
            name: 'Default host',
            host: 'http://default-registry.co',
          });
        }
        default:
          throw new Error('not found: ' + id);
      }
    });
    soClientMock.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'default-download-source-id',
          is_default: true,
          attributes: {
            download_source_id: 'test-source-id',
          },
        },
        {
          id: 'test-ds-1',
          attributes: {
            download_source_id: 'test-ds-1',
          },
        },
      ],
    } as any);
  });
  describe('getSourceUriForAgentPolicy', () => {
    it('should return the source_uri set on an agent policy ', async () => {
      const agentPolicy: AgentPolicy = {
        id: 'agent-policy-id',
        status: 'active',
        package_policies: [],
        is_managed: false,
        namespace: 'default',
        revision: 1,
        name: 'Policy',
        updated_at: '2022-01-01',
        updated_by: 'qwerty',
        download_source_id: 'test-ds-1',
      };

      expect(await getSourceUriForAgentPolicy(soClientMock, agentPolicy)).toEqual(
        'http://custom-registry-test'
      );
    });
    it('should return the default source_uri if there is none set on the agent policy ', async () => {
      const agentPolicy: AgentPolicy = {
        id: 'agent-policy-id',
        status: 'active',
        package_policies: [],
        is_managed: false,
        namespace: 'default',
        revision: 1,
        name: 'Policy',
        updated_at: '2022-01-01',
        updated_by: 'qwerty',
      };

      expect(await getSourceUriForAgentPolicy(soClientMock, agentPolicy)).toEqual(
        'http://default-registry.co'
      );
    });
  });
});
