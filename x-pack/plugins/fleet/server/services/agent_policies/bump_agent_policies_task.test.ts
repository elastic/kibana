/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';

import { _bumpPolicyIfDiffers } from './bump_agent_policies_task';

jest.mock('../app_context');
jest.mock('../agent_policy');

const mockedAgentPolicyService = jest.mocked(agentPolicyService);

describe('_bumpPolicyIfDiffers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
          data: {
            id: agentPolicyId,
            revision: 1,
            signed: {
              signature: 'signature',
              data: 'data',
            },
            outputs: {},
            inputs: [],
          },
        } as any;
      }
      return null;
    });
  });

  it('should bump policy if same revision but content differs, ignore signature', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.getFullAgentPolicy.mockImplementation((_, id) =>
      Promise.resolve({
        id,
        revision: 1,
        signed: {
          signature: 'signature2',
          data: 'data',
        },
        outputs: {},
        inputs: [],
        ...(id === 'policy1' ? { namespaces: [] } : {}),
      })
    );

    await _bumpPolicyIfDiffers(logger, soClient, esClient, 'policy1');

    expect(mockedAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('should not bump policy if same revision and content', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.getFullAgentPolicy.mockImplementation((_, id) =>
      Promise.resolve({
        id,
        revision: 1,
        signed: {
          signature: 'signature',
          data: 'data',
        },
        outputs: {},
        inputs: [],
      })
    );

    await _bumpPolicyIfDiffers(logger, soClient, esClient, 'policy1');

    expect(mockedAgentPolicyService.bumpRevision).toHaveBeenCalledTimes(0);
  });
});
