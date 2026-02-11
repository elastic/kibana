/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import expect from '@kbn/expect';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { v4 as uuidv4 } from 'uuid';

import pMap from 'p-map';
import { ENROLLMENT_API_KEYS_INDEX } from '@kbn/fleet-plugin/server/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetIndices } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const es: Client = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const apiClient = new SpaceTestApiClient(supertest);

  const NGINX_PACKAGE_VERSION = '1.20.0';

  function getPolicyId(idx: number | string) {
    return `test-policy-${idx}`;
  }

  async function createAgentPoliciesDocsBulk(
    deps: { savedObjects: typeof kibanaServer.savedObjects; esClient: Client },
    numberOfPolicies: number
  ) {
    const range = Array.from({ length: numberOfPolicies }, (_, i) => i + 1);
    await pMap(
      range,
      async (idx) => {
        await Promise.all([
          deps.savedObjects.create({
            id: getPolicyId(idx),
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
            attributes: {
              namespace: 'default',
              monitoring_enabled: ['logs', 'metrics', 'traces'],
              name: `Test Policy ${idx}`,
              description: 'test policy',
              is_default: false,
              is_default_fleet_server: false,
              inactivity_timeout: 1209600,
              is_preconfigured: false,
              status: 'active',
              is_managed: false,
              revision: 2,
              updated_at: new Date().toISOString(),
              updated_by: 'system',
              schema_version: '1.1.1',
              is_protected: false,
            },
            overwrite: true,
          }),
          // Create a fake enrollment API key for each policy so setup do not have to create one
          deps.esClient.bulk({
            refresh: 'wait_for',
            body: [
              { index: { _id: uuidv4(), _index: ENROLLMENT_API_KEYS_INDEX } },
              {
                active: true,
                api_key_id: 'faketest123',
                api_key: 'test==',
                name: `Test Policy ${idx}`,
                policy_id: `${getPolicyId(idx)}`,
                namespaces: ['default'],
                created_at: new Date().toISOString(),
              },
            ],
          }),
        ]);
      },
      { concurrency: 50 }
    );

    return range.map((idx) => getPolicyId(idx));
  }

  // Failing: See https://github.com/elastic/kibana/issues/248504
  describe.skip('Package Policy - perf reusable policies', function () {
    skipIfNoDockerRegistry(providerContext);
    this.timeout(2 * 60 * 1000); // 2 minutes
    let policyIds: string[] = [];
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);

      await fleetAndAgents.setup();
      policyIds = await createAgentPoliciesDocsBulk(
        {
          savedObjects: kibanaServer.savedObjects,
          esClient: es,
        },
        1000
      );
      await apiClient.installPackage({
        pkgName: 'nginx',
        pkgVersion: NGINX_PACKAGE_VERSION,
        force: true, // To avoid package verification
      });
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    afterEach(async () => {
      // Clean tasks
      await es.deleteByQuery({
        index: '.kibana_task_manager',
        conflicts: 'proceed',
        query: {
          bool: {
            must: [
              {
                terms: {
                  'task.taskType': ['fleet:deploy_agent_policies'],
                },
              },
            ],
          },
        },
      });
    });

    describe('perf tests', () => {
      it('should allow to create a package policies with 100 policy ids and .fleet-policies should be immediately created', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds.slice(0, 100),
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });

        expect(packagePolicyRes.item.policy_ids.length).to.be(100);
      });

      it('should allow to create a package policies with 1000 policy ids and .fleet-policies should be deployed asynchronously', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds,
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });
        expect(packagePolicyRes.item.policy_ids.length).to.be(1000);

        const esTasksSearchResponse = await es.search({
          index: '.kibana_task_manager',
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'task.taskType': ['fleet:deploy_agent_policies'],
                  },
                },
              ],
            },
          },
        });
        expect((esTasksSearchResponse.hits.total as SearchTotalHits).value).to.be.greaterThan(0);
      });

      it('should allow to delete a package policy with 100 policy ids', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds.slice(0, 100),
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });

        await apiClient.deletePackagePolicy(packagePolicyRes.item.id);
      });

      it('should allow to delete a package policy with 1000 policy ids', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds,
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });

        await apiClient.deletePackagePolicy(packagePolicyRes.item.id);
      });

      it('should allow to update a package policy with 100 policy ids', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds.slice(0, 100),
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });

        const updatePackagePolicyRes = await apiClient.updatePackagePolicy(
          packagePolicyRes.item.id,
          {
            policy_ids: policyIds.slice(0, 100),
            name: `test-nginx-${Date.now()}`,
            description: 'test',
            package: {
              name: 'nginx',
              version: NGINX_PACKAGE_VERSION,
            },
            inputs: {},
          }
        );

        expect(updatePackagePolicyRes.item.policy_ids.length).to.be(100);
      });

      it('should allow to update a package policy with 1000 policy ids', async function () {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: policyIds,
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: NGINX_PACKAGE_VERSION,
          },
          inputs: {},
        });

        const updatePackagePolicyRes = await apiClient.updatePackagePolicy(
          packagePolicyRes.item.id,
          {
            policy_ids: policyIds,
            name: `test-nginx-${Date.now()}`,
            description: 'test',
            package: {
              name: 'nginx',
              version: NGINX_PACKAGE_VERSION,
            },
            inputs: {},
          }
        );

        expect(updatePackagePolicyRes.item.policy_ids.length).to.be(1000);
      });
    });
  });
}
