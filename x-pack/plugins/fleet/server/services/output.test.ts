/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { OutputSOAttributes } from '../types';

import { OUTPUT_SAVED_OBJECT_TYPE } from '../constants';

import { outputService, outputIdToUuid } from './output';
import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import { auditLoggingService } from './audit_logging';

jest.mock('./app_context');
jest.mock('./agent_policy');
jest.mock('./audit_logging');

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

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

      case outputIdToUuid('existing-preconfigured-default-output-allow-edit-name'): {
        return mockOutputSO('existing-preconfigured-default-output-allow-edit-name', {
          name: 'test',
          allow_edit: ['name'],
        });
      }

      case outputIdToUuid('existing-logstash-output'): {
        return mockOutputSO('existing-logstash-output', {
          type: 'logstash',
          is_default: false,
        });
      }

      case outputIdToUuid('existing-es-output'): {
        return mockOutputSO('existing-es-output', {
          type: 'elasticsearch',
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

  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClient);

  return soClient;
}

describe('Output Service', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    mockedAgentPolicyService.list.mockClear();
    mockedAgentPolicyService.hasAPMIntegration.mockClear();
    mockedAgentPolicyService.hasFleetServerIntegration.mockClear();
    mockedAgentPolicyService.removeOutputFromAll.mockReset();
    mockedAppContextService.getInternalUserSOClient.mockReset();
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReset();
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
    mockedAgentPolicyService.update.mockReset();
  });
  describe('create', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        esClientMock,
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
        esClientMock,
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
        esClientMock,
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
        esClientMock,
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
        esClientMock,
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
          esClientMock,
          {
            is_default: true,
            is_default_monitoring: false,
            name: 'Test',
            type: 'elasticsearch',
          },
          { id: 'output-test' }
        )
      ).rejects.toThrow(
        `Preconfigured output existing-preconfigured-default-output is_default cannot be updated outside of kibana config file.`
      );
    });

    it('should update existing default preconfigured monitoring output when creating a new default output from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });

      await outputService.create(
        soClient,
        esClientMock,
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

    // With logstash output
    it('should throw if encryptedSavedObject is not configured', async () => {
      const soClient = getMockedSoClient({});

      await expect(
        outputService.create(
          soClient,
          esClientMock,
          {
            is_default: false,
            is_default_monitoring: false,
            name: 'Test',
            type: 'logstash',
          },
          { id: 'output-test' }
        )
      ).rejects.toThrow(`Logstash output needs encrypted saved object api key to be set`);
    });

    it('should work if encryptedSavedObject is configured', async () => {
      const soClient = getMockedSoClient({});
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: true,
      } as any);
      await outputService.create(
        soClient,
        esClientMock,
        {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
        },
        { id: 'output-test' }
      );
      expect(soClient.create).toBeCalled();
    });

    it('Should update fleet server policies with data_output_id=default_output_id if a new default logstash output is created', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: true,
      } as any);
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [
          {
            name: 'fleet server policy',
            id: 'fleet_server_policy',
            is_default_fleet_server: true,
            package_policies: [
              {
                name: 'fleet-server-123',
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
          {
            name: 'agent policy 1',
            id: 'agent_policy_1',
            is_managed: false,
            package_policies: [
              {
                name: 'nginx',
                package: {
                  name: 'nginx',
                },
              },
            ],
          },
        ],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

      await outputService.create(
        soClient,
        esClientMock,
        {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
        },
        { id: 'output-1' }
      );

      expect(mockedAgentPolicyService.update).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('Should allow to create a new logstash output with no errors if is not set as default', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: true,
      } as any);
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [
          {
            name: 'fleet server policy',
            id: 'fleet_server_policy',
            is_default_fleet_server: true,
            package_policies: [
              {
                name: 'fleet-server-123',
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
          {
            name: 'agent policy 1',
            id: 'agent_policy_1',
            is_managed: false,
            package_policies: [
              {
                name: 'nginx',
                package: {
                  name: 'nginx',
                },
              },
            ],
          },
        ],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

      await outputService.create(
        soClient,
        esClientMock,
        {
          is_default: false,
          is_default_monitoring: false,
          name: 'Test',
          type: 'logstash',
        },
        { id: 'output-1' }
      );
    });

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient();

      await outputService.create(
        soClient,
        esClientMock,
        {
          is_default: false,
          is_default_monitoring: true,
          name: 'Test',
          type: 'elasticsearch',
        },
        { id: 'output-test' }
      );

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: outputIdToUuid('output-test'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('update', () => {
    it('should update existing default output when updating an output to become the default output', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.update(soClient, esClientMock, 'output-test', {
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

      await outputService.update(soClient, esClientMock, 'existing-default-output', {
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

      await outputService.update(soClient, esClientMock, 'output-test', {
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
    it('Do not allow to update a preconfigured output outside from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await expect(
        outputService.update(soClient, esClientMock, 'existing-preconfigured-default-output', {
          config_yaml: 'test: 123',
        })
      ).rejects.toThrow(
        'Preconfigured output existing-preconfigured-default-output config_yaml cannot be updated outside of kibana config file.'
      );
    });

    it('Allow to update a preconfigured output from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.update(
        soClient,
        esClientMock,
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

    it('Allow to update preconfigured output allowed to edit field from preconfiguration', async () => {
      const soClient = getMockedSoClient();
      await outputService.update(
        soClient,
        esClientMock,
        'existing-preconfigured-default-output-allow-edit-name',
        {
          name: 'test 123',
        },
        {
          fromPreconfiguration: false,
        }
      );

      expect(soClient.update).toBeCalled();
    });

    it('Should throw when an existing preconfigured default output and updating an output to become the default one outside of preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-preconfigured-default-output',
      });

      await expect(
        outputService.update(soClient, esClientMock, 'output-test', {
          is_default: true,
          is_default_monitoring: false,
          name: 'Test',
          type: 'elasticsearch',
        })
      ).rejects.toThrow(
        `Preconfigured output existing-preconfigured-default-output is_default cannot be updated outside of kibana config file.`
      );
    });

    it('Should update existing default preconfigured monitoring output when updating an output to become the default one from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'existing-default-output',
      });

      await outputService.update(
        soClient,
        esClientMock,
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

    // With ES output
    it('Should delete Logstash specific fields if the output type change to ES', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
      });

      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        type: 'elasticsearch',
        hosts: ['http://test:4343'],
        ssl: null,
      });
    });

    // With logstash output
    it('Should work if you try to make that output the default output and no policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        is_default: true,
      });

      expect(soClient.update).toBeCalled();
    });

    it('Should call update with null fields if', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-logstash-output', {
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        config_yaml: null,
        ssl: null,
      });

      expect(soClient.update).toBeCalled();
      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
        config_yaml: null,
        ssl: null,
      });
    });

    it('Should throw if you try to make that output the default output and somne policies using default output has APM integration', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(true);

      await expect(
        outputService.update(soClient, esClientMock, 'existing-logstash-output', {
          is_default: true,
        })
      ).rejects.toThrow(`Logstash output cannot be used with APM integration.`);
    });

    it('Should delete ES specific fields if the output type changes to logstash', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [{}],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasAPMIntegration.mockReturnValue(false);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(false);

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        type: 'logstash',
        hosts: ['test:4343'],
      });

      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
    });

    it('Should update fleet server policies with data_output_id=default_output_id if a default ES output is changed to logstash', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [
          {
            name: 'fleet server policy',
            id: 'fleet_server_policy',
            is_default_fleet_server: true,
            package_policies: [
              {
                name: 'fleet-server-123',
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
          {
            name: 'agent policy 1',
            id: 'agent_policy_1',
            is_managed: false,
            package_policies: [
              {
                name: 'nginx',
                package: {
                  name: 'nginx',
                },
              },
            ],
          },
        ],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

      await outputService.update(soClient, esClientMock, 'output-test', {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
      });

      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: false }
      );
    });

    it('Should update fleet server policies with data_output_id=default_output_id and force=true if a default ES output is changed to logstash, from preconfiguration', async () => {
      const soClient = getMockedSoClient({
        defaultOutputId: 'output-test',
      });
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [
          {
            name: 'fleet server policy',
            id: 'fleet_server_policy',
            is_default_fleet_server: true,
            package_policies: [
              {
                name: 'fleet-server-123',
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
          {
            name: 'agent policy 1',
            id: 'agent_policy_1',
            is_managed: false,
            package_policies: [
              {
                name: 'nginx',
                package: {
                  name: 'nginx',
                },
              },
            ],
          },
        ],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

      await outputService.update(
        soClient,
        esClientMock,
        'output-test',
        {
          type: 'logstash',
          hosts: ['test:4343'],
          is_default: true,
        },
        {
          fromPreconfiguration: true,
        }
      );

      expect(soClient.update).toBeCalledWith(expect.anything(), expect.anything(), {
        type: 'logstash',
        hosts: ['test:4343'],
        is_default: true,
        ca_sha256: null,
        ca_trusted_fingerprint: null,
      });
      expect(mockedAgentPolicyService.update).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'fleet_server_policy',
        { data_output_id: 'output-test' },
        { force: true }
      );
    });

    it('Should return an error if trying to change the output to logstash for fleet server policy', async () => {
      const soClient = getMockedSoClient({});
      mockedAgentPolicyService.list.mockResolvedValue({
        items: [
          {
            name: 'fleet server policy',
            id: 'fleet_server_policy',
            is_default_fleet_server: true,
            package_policies: [
              {
                name: 'fleet-server-123',
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
          {
            name: 'agent policy 1',
            id: 'agent_policy_1',
            is_managed: false,
            package_policies: [
              {
                name: 'nginx',
                package: {
                  name: 'nginx',
                },
              },
            ],
          },
        ],
      } as unknown as ReturnType<typeof mockedAgentPolicyService.list>);
      mockedAgentPolicyService.hasFleetServerIntegration.mockReturnValue(true);

      await expect(
        outputService.update(soClient, esClientMock, 'existing-es-output', {
          type: 'logstash',
          hosts: ['test:4343'],
        })
      ).rejects.toThrowError(
        'Logstash output cannot be used with Fleet Server integration in fleet server policy. Please create a new ElasticSearch output.'
      );
    });

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient({ defaultOutputId: 'existing-es-output' });

      await outputService.update(soClient, esClientMock, 'existing-es-output', {
        hosts: ['new-host:443'],
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'update',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
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

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient();
      await outputService.delete(soClient, 'existing-es-output');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'delete',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('get', () => {
    it('work with a predefined id', async () => {
      const soClient = getMockedSoClient();
      const output = await outputService.get(soClient, 'output-test');

      expect(soClient.get).toHaveBeenCalledWith('ingest-outputs', outputIdToUuid('output-test'));

      expect(output.id).toEqual('output-test');
    });

    it('should call audit logger', async () => {
      const soClient = getMockedSoClient();
      await outputService.get(soClient, 'existing-es-output');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'get',
        id: outputIdToUuid('existing-es-output'),
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
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
