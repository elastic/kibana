/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import type { OutputSOAttributes } from '../types';

import { outputService, outputIdToUuid } from './output';
import { appContextService } from './app_context';

jest.mock('./app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const CLOUD_ID =
  'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';

const CONFIG_WITH_ES_HOSTS = {
  enabled: true,
  agents: {
    enabled: true,
    elasticsearch: {
      hosts: ['http://host1.com'],
    },
  },
};

const CONFIG_WITHOUT_ES_HOSTS = {
  enabled: true,
  agents: {
    enabled: true,
    elasticsearch: {},
  },
};

function getMockedSoClient() {
  const soClient = savedObjectsClientMock.create();
  soClient.get.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case outputIdToUuid('output-test'): {
        return {
          id: outputIdToUuid('output-test'),
          type: 'ingest-outputs',
          references: [],
          attributes: {
            output_id: 'output-test',
          },
        };
      }
      default:
        throw new Error('not found');
    }
  });

  return soClient;
}

describe('Output Service', () => {
  describe('create', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();
      soClient.create.mockResolvedValue({
        id: outputIdToUuid('output-test'),
        type: 'ingest-output',
        attributes: {},
        references: [],
      });
      await outputService.create(
        soClient,
        {
          is_default: false,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(soClient.create).toBeCalled();

      // ID should always be the same for a predefined id
      expect(soClient.create.mock.calls[0][2]?.id).toEqual(outputIdToUuid('output-test'));
      expect((soClient.create.mock.calls[0][1] as OutputSOAttributes).output_id).toEqual(
        'output-test'
      );
    });
  });

  describe('get', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();
      const output = await outputService.get(soClient, 'output-test');

      expect(soClient.get).toHaveBeenCalledWith('ingest-outputs', outputIdToUuid('output-test'));

      expect(output.id).toEqual('output-test');
    });
  });

  describe('getDefaultOutputId', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();
      soClient.find.mockResolvedValue({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [
          {
            id: outputIdToUuid('output-test'),
            type: 'ingest-outputs',
            references: [],
            score: 0,
            attributes: {
              output_id: 'output-test',
              is_default: true,
            },
          },
        ],
      });
      const defaultId = await outputService.getDefaultOutputId(soClient);

      expect(soClient.find).toHaveBeenCalled();

      expect(defaultId).toEqual('output-test');
    });
  });

  describe('getDefaultESHosts', () => {
    afterEach(() => {
      mockedAppContextService.getConfig.mockReset();
      mockedAppContextService.getConfig.mockReset();
    });
    it('Should use cloud ID as the source of truth for ES hosts', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: true,
        cloudId: CLOUD_ID,
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITH_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual([
        'https://cec6f261a74bf24ce33bb8811b84294f.us-east-1.aws.found.io:443',
      ]);
    });

    it('Should use the value from the config if not in cloud', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: false,
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITH_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual(['http://host1.com']);
    });

    it('Should use the default value if there is no config', () => {
      // @ts-expect-error
      mockedAppContextService.getCloud.mockReturnValue({
        isCloudEnabled: false,
      });

      mockedAppContextService.getConfig.mockReturnValue(CONFIG_WITHOUT_ES_HOSTS);

      const hosts = outputService.getDefaultESHosts();

      expect(hosts).toEqual(['http://localhost:9200']);
    });
  });
});
