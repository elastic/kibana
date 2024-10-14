/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from '../api_keys';

import { ensureAgentPoliciesFleetServerKeysAndPolicies } from './fleet_server_policies_enrollment_keys';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../api_keys');

const mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy = jest.mocked(
  ensureDefaultEnrollmentAPIKeyForAgentPolicy
);

const mockedAgentPolicyService = jest.mocked(agentPolicyService);

describe('ensureAgentPoliciesFleetServerKeysAndPolicies', () => {
  beforeEach(() => {
    jest.mocked(appContextService).getSecurity.mockReturnValue({
      authc: { apiKeys: { areAPIKeysEnabled: async () => true } },
    } as any);
    jest.mocked(appContextService).getExperimentalFeatures.mockReturnValue({
      asyncDeployPolicies: false,
    } as any);

    mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy.mockReset();
    mockedAgentPolicyService.getLatestFleetPolicy.mockReset();
    mockedAgentPolicyService.deployPolicies.mockImplementation(async () => {});
    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'policy1',
          revision: 1,
        },
        {
          id: 'policy2',
          revision: 2,
        },
      ],
    } as any);
  });

  it('should do nothing with policies already deployed', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      if (agentPolicyId === 'policy2') {
        return {
          revision_idx: 2,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(mockedAgentPolicyService.deployPolicies).not.toBeCalled();
  });

  it('should do deploy policies out of sync', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      if (agentPolicyId === 'policy2') {
        return {
          revision_idx: 1,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(expect.anything(), ['policy2']);
  });

  it('should do deploy policies never deployed', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(expect.anything(), ['policy2']);
  });

  it('handle errors when deploying policies', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      return null;
    });
    mockedAgentPolicyService.deployPolicies.mockRejectedValue(new Error('test rejection'));

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(expect.anything(), ['policy2']);

    expect(logger.warn).toBeCalledWith(
      'Error deploying policies: test rejection',
      expect.anything()
    );
  });
});
