/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../../constants';
import { setupFleet } from '../setup';
import { getAgentsByKuery, forceUnenrollAgent } from '../agents';
import { listEnrollmentApiKeys, deleteEnrollmentApiKey } from '../api_keys';

import { resetPreconfiguredAgentPolicies } from './reset_agent_policies';

jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../setup');
jest.mock('../agents');
jest.mock('../api_keys');

const mockedSetupFleet = setupFleet as jest.MockedFunction<typeof setupFleet>;
const mockedForceUnenrollAgent = forceUnenrollAgent as jest.MockedFunction<
  typeof forceUnenrollAgent
>;
const mockedDeleteEnrollmentApiKey = deleteEnrollmentApiKey as jest.MockedFunction<
  typeof deleteEnrollmentApiKey
>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedListEnrollmentApiKeys = listEnrollmentApiKeys as jest.MockedFunction<
  typeof listEnrollmentApiKeys
>;

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

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

describe('reset agent policies', () => {
  it('should not unenroll agents or revoke enrollment api keys if there is no existing policies', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockedAgentPolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    soClient.find.mockImplementation(async (option) => {
      if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
        return { saved_objects: [] } as any;
      }

      throw new Error('not mocked');
    });
    await resetPreconfiguredAgentPolicies(soClient, esClient);

    expect(mockedSetupFleet).toBeCalled();
    expect(mockedForceUnenrollAgent).not.toBeCalled();
    expect(mockedDeleteEnrollmentApiKey).not.toBeCalled();
  });

  it('should unenroll agents and revoke enrollment api keys if there is policies', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockedAgentPolicyService.list.mockResolvedValueOnce({
      items: [{ id: 'policy1' }],
    } as any);
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [{ id: 'agent1' }],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValueOnce({
      items: [{ id: 'key1' }],
    } as any);
    soClient.find.mockImplementation(async (option) => {
      if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [],
        } as any;
      }

      throw new Error('not mocked');
    });
    await resetPreconfiguredAgentPolicies(soClient, esClient);

    expect(mockedSetupFleet).toBeCalled();
    expect(mockedForceUnenrollAgent).toBeCalled();
    expect(mockedDeleteEnrollmentApiKey).toBeCalled();
  });
});
