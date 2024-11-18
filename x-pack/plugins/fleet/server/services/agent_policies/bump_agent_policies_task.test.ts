/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';

import { packagePolicyService } from '../package_policy';
import type { PackagePolicy } from '../../types';

import { _updatePackagePoliciesThatNeedBump } from './bump_agent_policies_task';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../package_policy');

const mockedAgentPolicyService = jest.mocked(agentPolicyService);
const mockedPackagePolicyService = jest.mocked(packagePolicyService);

describe('_updatePackagePoliciesThatNeedBump', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'packagePolicy1',
          bump_agent_policy_revision: true,
        } as PackagePolicy,
      ],
      page: 1,
      perPage: 100,
    });
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      total: 0,
      items: [],
      page: 1,
      perPage: 100,
    });
  });

  it('should update package policy if bump agent policy revision needed', async () => {
    const logger = loggingSystemMock.createLogger();

    await _updatePackagePoliciesThatNeedBump(logger);

    expect(mockedPackagePolicyService.bulkUpdate).toHaveBeenCalledWith(undefined, undefined, [
      { bump_agent_policy_revision: false, id: 'packagePolicy1' },
    ]);
  });
});
