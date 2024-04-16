/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { appContextService } from '..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock } from '../../mocks';

import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getAgentsByKuery, getAgentStatusById } from '../agents';

import { checkFleetServerVersionsForSecretsStorage } from '.';

jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../agents');

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedGetAgentStatusById = getAgentStatusById as jest.MockedFunction<
  typeof getAgentStatusById
>;

describe('checkFleetServerVersionsForSecretsStorage', () => {
  let mockContext: MockedFleetAppContext;

  beforeEach(() => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  it('should return true if all fleet server versions are at least the specified version and there are no managed policies', async () => {
    const version = '1.0.0';

    mockedPackagePolicyService.list
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: '1',
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
          {
            id: '2',
            policy_id: '2',
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        items: [],
      } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([]);

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: '1',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
        {
          id: '2',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
      ],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('online');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );
    expect(result).toBe(true);
  });
});
