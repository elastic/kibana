/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import type { PackagePolicy } from '../../../common';

import { populatePackagePolicyAssignedAgentsCount } from './populate_package_policy__assigned_agents_count';

describe('When using populatePackagePolicyAssignedAgentCount()', () => {
  let esClientMock: ElasticsearchClientMock;
  let packagePolicies: PackagePolicy[];

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClientMock.search.mockImplementation(async (args) => {
      return {
        took: 3,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 100,
          max_score: 0,
          hits: [],
        },
      };
    });

    packagePolicies = Array.from({ length: 15 }, (_, n) => {
      const now = new Date().toISOString();

      return {
        id: `package-policy-${n}`,
        name: `Package Policy ${n}`,
        description: '',
        created_at: now,
        created_by: 'elastic',
        updated_at: now,
        updated_by: 'elastic',
        policy_id: `agent-policy-id-${n % 2 > 0 ? 'a' : 'b'}`,
        enabled: true,
        inputs: [],
        namespace: 'default',
        package: {
          name: 'a-package',
          title: 'package A',
          version: '1.0.0',
        },
        revision: 1,
      };
    });
  });

  it('should add `agents` property to each package policy', async () => {
    await populatePackagePolicyAssignedAgentsCount(esClientMock, packagePolicies);

    for (const packagePolicy of packagePolicies) {
      expect(packagePolicy.agents).toEqual(100);
    }
  });

  it('should only make 1 api call per agent policy to get agent count', async () => {
    await populatePackagePolicyAssignedAgentsCount(esClientMock, packagePolicies);
    expect(esClientMock.search).toHaveBeenCalledTimes(2);
  });
});
