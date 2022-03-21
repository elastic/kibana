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
import { agentPolicyService } from './agent_policy';

jest.mock('./app_context');
jest.mock('./agent_policy');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

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

function mockOutputSO(id: string, attributes: any = {}) {
  return {
    id: outputIdToUuid(id),
    type: 'ingest-outputs',
    references: [],
    attributes: {
      output_id: id,
      ...attributes,
    },
  };
}

function getMockedSoClient(
  options: { defaultOutputId?: string; defaultOutputMonitoringId?: string } = {}
) {
  const soClient = savedObjectsClientMock.create();

  soClient.get.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case outputIdToUuid('output-test'): {
        return mockOutputSO('output-test');
      }
      case outputIdToUuid('existing-default-output'): {
        return mockOutputSO('existing-default-output');
      }
      case outputIdToUuid('existing-default-monitoring-output'): {
        return mockOutputSO('existing-default-monitoring-output', {
          is_default: true,
          type: 'elasticsearch',
        });
      }
      case outputIdToUuid('existing-preconfigured-default-output'): {
        return mockOutputSO('existing-preconfigured-default-output', {
          is_default: true,
          is_preconfigured: true,
        });
      }

      case outputIdToUuid('existing-logstash-output'): {
        return mockOutputSO('existing-logstash-output', {
          type: 'logstash',
          is_default: false,
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
      options?.defaultOutputMonitoringId &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('is_default_monitoring') &&
      findOptions.search === 'true'
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClient.get(
              'ingest-outputs',
              outputIdToUuid(options.defaultOutputMonitoringId)
            )),
          },
        ],
        total: 1,
      };
    }

    if (
      options?.defaultOutputId &&
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
            ...(await soClient.get('ingest-outputs', outputIdToUuid(options.defaultOutputId))),
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

  return soClient;
}

describe('Output Service', () => {
  beforeEach(() => {
    mockedAgentPolicyService.list.mockClear();
    mockedAgentPolicyService.hasAPMIntegration.mockClear();
    mockedAgentPolicyService.removeOutputFromAll.mockReset();
  });
  describe('create', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        {
          is_default: false,
          is_default_monitoring: false,
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

    it('should create a new default output if none exists before', async () => {
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(soClient.update).not.toBeCalled();
    });

    it('should update existing default output when creating a new default output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.create(
        soClient,
        {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: false }
      );
    });

    it('should create a new default monitoring output if none exists before', async () => {
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        {
          is_default: false,
          is_default_monitoring: true,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(soClient.update).not.toBeCalled();
    });

    it('should update existing default monitoring output when creating a new default output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputMonitoringId: 'existing-default-monitoring-output',
      });

      await outputService.create(
        soClient,
        {
          is_default: true,
          is_default_monitoring: true,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-monitoring-output'),
        { is_default_monitoring: false }
      );
    });

    // With preconfigured outputs
    it('should throw when an existing preconfigured default output and creating a new default output outside of preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });

      await expect(
        outputService.create(
          soClient,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        )
      ).rejects.toThrow(
        `Preconfigured output existing-preconfigured-default-output cannot be updated outside of kibana config file.`
      );
    });

    it('should update existing default preconfigured monitoring output when creating a new default output from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });

      await outputService.create(
        soClient,
        {
          is_default: true,
          is_default_monitoring: true,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test', fromPreconfiguration: true }
      );

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-preconfigured-default-output'),
        { is_default: false }
      );
    });
  });

  describe('update', () => {
    it('should update existing default output when updating an output to become the default output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.update(soClient, 'output-test', {
        is_default: true,
      });

      expect(soClient.update).toBeCalledTimes(2);
      expect(soClient.update).toBeCalledWith(expect.anything(), outputIdToUuid('output-test'), {
        is_default: true,
      });
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: false }
      );
    });

    it('should not update existing default output when the output is already the default one', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.update(soClient, 'existing-default-output', {
        is_default: true,
        name: 'Test',
      });

      expect(soClient.update).toBeCalledTimes(1);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: true, name: 'Test' }
      );
    });

    it('should update existing default monitoring output when updating an output to become the default monitoring output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputMonitoringId: 'existing-default-monitoring-output',
      });

      await outputService.update(soClient, 'output-test', {
        is_default_monitoring: true,
      });

      expect(soClient.update).toBeCalledTimes(2);
      expect(soClient.update).toBeCalledWith(expect.anything(), outputIdToUuid('output-test'), {
        is_default_monitoring: true,
      });
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-monitoring-output'),
        { is_default_monitoring: false }
      );
    });

    // With preconfigured outputs
    it('Do not allow to update a preconfigured output outisde from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, 'existing-preconfigured-default-output', {
          config_yaml: '',
        })
      ).rejects.toThrow(
        'Preconfigured output existing-preconfigured-default-output cannot be updated outside of kibana config file.'
      );
    });

    it('Allow to update a preconfigured output from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.update(
        soClient,
        'existing-preconfigured-default-output',
        {
          config_yaml: '',
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toBeCalled();
    });

    it('Should throw when an existing preconfigured default output and updating an output to become the default one outside of preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });

      await expect(
        outputService.update(soClient, 'output-test', {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        })
      ).rejects.toThrow(
        `Preconfigured output existing-preconfigured-default-output cannot be updated outside of kibana config file.`
      );
    });

    it('Should update existing default preconfigured monitoring output when updating an output to become the default one from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.update(
        soClient,
        'output-test',
        {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        },
        { fromPreconfiguration: true }
      );

      expect(soClient.update).toBeCalledTimes(2);
      expect(soClient.update).toBeCalledWith(
        expect.anything(),
        outputIdToUuid('existing-default-output'),
        { is_default: false }
      );
    });

    // With logstash output
    it('Should work if you try to make that output the default output and no policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);

      await outputService.update(soClient, 'existing-logstash-output', {
        is_default: true,
      });

      expect(soClient.update).toBeCalled();
    });
    it('Should throw if you try to make that output the default output and somne policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(true);

      await expect(
        outputService.update(soClient, 'existing-logstash-output', {
          is_default: true,
        })
      ).rejects.toThrow(`Logstash output cannot be used with APM integration.`);
    });
  });

  describe('delete', () => {
    // Preconfigured output
    it('Do not allow to delete a preconfigured output outisde from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await expect(
        outputService.delete(soClient, 'existing-preconfigured-default-output')
      ).rejects.toThrow(
        'Preconfigured output existing-preconfigured-default-output cannot be deleted outside of kibana config file.'
      );
    });

    it('Allow to delete a preconfigured output from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete(soClient, 'existing-preconfigured-default-output', {
        fromPreconfiguration: true,
      });

      expect(soClient.delete).toBeCalled();
    });

    it('Call removeOutputFromAll before deleting the output', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete(soClient, 'existing-preconfigured-default-output', {
        fromPreconfiguration: true,
      });
      expect(mockedAgentPolicyService.removeOutputFromAll).toBeCalled();
      expect(soClient.delete).toBeCalled();
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

  describe('getDefaultDataOutputId', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      const defaultId = await outputService.getDefaultDataOutputId(soClient);

      expect(soClient.find).toHaveBeenCalled();

      expect(defaultId).toEqual('output-test');
    });
  });

  describe('getDefaultMonitoringOutputOd', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient({
        defaultOutputMonitoringId: 'output-test',
      });
      const defaultId = await outputService.getDefaultMonitoringOutputId(soClient);

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
