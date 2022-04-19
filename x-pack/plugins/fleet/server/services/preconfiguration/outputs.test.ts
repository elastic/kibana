/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { PreconfiguredOutput } from '../../../common/types';
import type { Output } from '../../types';

import * as agentPolicy from '../agent_policy';
import { outputService } from '../output';

import { createOrUpdatePreconfiguredOutputs, cleanPreconfiguredOutputs } from './outputs';

jest.mock('../agent_policy_update');
jest.mock('../output');
jest.mock('../epm/packages/bundled_packages');
jest.mock('../epm/archive');

const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: () =>
      new Proxy(
        {},
        {
          get() {
            return jest.fn();
          },
        }
      ),
  },
}));

const spyAgentPolicyServicBumpAllAgentPoliciesForOutput = jest.spyOn(
  agentPolicy.agentPolicyService,
  'bumpAllAgentPoliciesForOutput'
);

describe('output preconfiguration', () => {
  beforeEach(() => {
    mockedOutputService.create.mockReset();
    mockedOutputService.update.mockReset();
    mockedOutputService.delete.mockReset();
    mockedOutputService.getDefaultDataOutputId.mockReset();
    mockedOutputService.getDefaultESHosts.mockReturnValue(['http://default-es:9200']);
    mockedOutputService.bulkGet.mockImplementation(async (soClient, id): Promise<Output[]> => {
      return [
        {
          id: 'existing-output-1',
          is_default: false,
          is_default_monitoring: false,
          name: 'Output 1',
          // @ts-ignore
          type: 'elasticsearch',
          hosts: ['http://es.co:80'],
          is_preconfigured: true,
        },
      ];
    });
  });

  it('should create preconfigured output that does not exists', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'non-existing-output-1',
        name: 'Output 1',
        type: 'elasticsearch',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['http://test.fr'],
      },
    ]);

    expect(mockedOutputService.create).toBeCalled();
    expect(mockedOutputService.update).not.toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).not.toBeCalled();
  });

  it('should set default hosts if hosts is not set output that does not exists', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'non-existing-output-1',
        name: 'Output 1',
        type: 'elasticsearch',
        is_default: false,
        is_default_monitoring: false,
      },
    ]);

    expect(mockedOutputService.create).toBeCalled();
    expect(mockedOutputService.create.mock.calls[0][1].hosts).toEqual(['http://default-es:9200']);
  });

  it('should update output if non preconfigured output with the same id exists', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient.find.mockResolvedValue({ saved_objects: [], page: 0, per_page: 0, total: 0 });
    mockedOutputService.bulkGet.mockResolvedValue([
      {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        // @ts-ignore
        type: 'elasticsearch',
        hosts: ['http://es.co:80'],
        is_preconfigured: false,
      },
    ]);
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co:80'],
      },
    ]);

    expect(mockedOutputService.create).not.toBeCalled();
    expect(mockedOutputService.update).toBeCalled();
    expect(mockedOutputService.update).toBeCalledWith(
      expect.anything(),
      'existing-output-1',
      expect.objectContaining({
        is_preconfigured: true,
      }),
      { fromPreconfiguration: true }
    );
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).toBeCalled();
  });

  it('should update output if preconfigured output exists and changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient.find.mockResolvedValue({ saved_objects: [], page: 0, per_page: 0, total: 0 });
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://newhostichanged.co:9201'], // field that changed
      },
    ]);

    expect(mockedOutputService.create).not.toBeCalled();
    expect(mockedOutputService.update).toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).toBeCalled();
  });

  it('should not delete default output if preconfigured default output exists and changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient.find.mockResolvedValue({ saved_objects: [], page: 0, per_page: 0, total: 0 });
    mockedOutputService.getDefaultDataOutputId.mockResolvedValue('existing-output-1');
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'existing-output-1',
        is_default: true,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://newhostichanged.co:9201'], // field that changed
      },
    ]);

    expect(mockedOutputService.delete).not.toBeCalled();
    expect(mockedOutputService.create).not.toBeCalled();
    expect(mockedOutputService.update).toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).toBeCalled();
  });

  const SCENARIOS: Array<{ name: string; data: PreconfiguredOutput }> = [
    {
      name: 'no changes',
      data: {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co:80'],
      },
    },
    {
      name: 'hosts without port',
      data: {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co'],
      },
    },
  ];
  SCENARIOS.forEach((scenario) => {
    const { data, name } = scenario;
    it(`should do nothing if preconfigured output exists and did not changed (${name})`, async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await createOrUpdatePreconfiguredOutputs(soClient, esClient, [data]);

      expect(mockedOutputService.create).not.toBeCalled();
      expect(mockedOutputService.update).not.toBeCalled();
    });
  });

  describe('cleanPreconfiguredOutputs', () => {
    it('should not delete non deleted preconfigured output', async () => {
      const soClient = savedObjectsClientMock.create();
      mockedOutputService.list.mockResolvedValue({
        items: [
          { id: 'output1', is_preconfigured: true } as Output,
          { id: 'output2', is_preconfigured: true } as Output,
        ],
        page: 1,
        perPage: 10000,
        total: 1,
      });
      await cleanPreconfiguredOutputs(soClient, [
        {
          id: 'output1',
          is_default: false,
          is_default_monitoring: false,
          name: 'Output 1',
          type: 'elasticsearch',
          hosts: ['http://es.co:9201'],
        },
        {
          id: 'output2',
          is_default: false,
          is_default_monitoring: false,
          name: 'Output 2',
          type: 'elasticsearch',
          hosts: ['http://es.co:9201'],
        },
      ]);

      expect(mockedOutputService.delete).not.toBeCalled();
    });

    it('should delete deleted preconfigured output', async () => {
      const soClient = savedObjectsClientMock.create();
      mockedOutputService.list.mockResolvedValue({
        items: [
          { id: 'output1', is_preconfigured: true } as Output,
          { id: 'output2', is_preconfigured: true } as Output,
        ],
        page: 1,
        perPage: 10000,
        total: 1,
      });
      await cleanPreconfiguredOutputs(soClient, [
        {
          id: 'output1',
          is_default: false,
          is_default_monitoring: false,
          name: 'Output 1',
          type: 'elasticsearch',
          hosts: ['http://es.co:9201'],
        },
      ]);

      expect(mockedOutputService.delete).toBeCalled();
      expect(mockedOutputService.delete).toBeCalledTimes(1);
      expect(mockedOutputService.delete.mock.calls[0][1]).toEqual('output2');
    });

    it('should update default deleted preconfigured output', async () => {
      const soClient = savedObjectsClientMock.create();
      mockedOutputService.list.mockResolvedValue({
        items: [
          { id: 'output1', is_preconfigured: true, is_default: true } as Output,
          { id: 'output2', is_preconfigured: true, is_default_monitoring: true } as Output,
        ],
        page: 1,
        perPage: 10000,
        total: 1,
      });
      await cleanPreconfiguredOutputs(soClient, []);

      expect(mockedOutputService.delete).not.toBeCalled();
      expect(mockedOutputService.update).toBeCalledTimes(2);
      expect(mockedOutputService.update).toBeCalledWith(
        expect.anything(),
        'output1',
        expect.objectContaining({
          is_preconfigured: false,
        }),
        { fromPreconfiguration: true }
      );
      expect(mockedOutputService.update).toBeCalledWith(
        expect.anything(),
        'output2',
        expect.objectContaining({
          is_preconfigured: false,
        }),
        { fromPreconfiguration: true }
      );
    });
  });
});
