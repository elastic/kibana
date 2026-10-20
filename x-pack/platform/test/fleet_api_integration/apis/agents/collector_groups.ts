/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetIndices, createTestSpace } from '../space_awareness/helpers';

interface CollectorAttrs {
  group?: string;
  groupName?: string;
  configName?: string;
  configDescription?: string;
  pipelines?: Record<string, any>;
  namespaces?: string[];
}

async function createOpampCollector(esClient: any, id: string, attrs: CollectorAttrs = {}) {
  await esClient.create({
    id,
    refresh: 'wait_for',
    index: AGENTS_INDEX,
    document: {
      active: true,
      type: 'OPAMP',
      policy_id: 'policy1',
      status: 'online',
      local_metadata: { host: { hostname: id } },
      user_provided_metadata: {},
      enrolled_at: new Date().toISOString(),
      last_checkin: new Date().toISOString(),
      last_checkin_status: 'online',
      ...(attrs.namespaces ? { namespaces: attrs.namespaces } : {}),
      non_identifying_attributes: {
        elastic: {
          collector: {
            ...(attrs.group !== undefined ? { group: attrs.group } : {}),
            ...(attrs.groupName ? { group_name: attrs.groupName } : {}),
          },
        },
        config: {
          ...(attrs.configName ? { name: attrs.configName } : {}),
          ...(attrs.configDescription ? { description: attrs.configDescription } : {}),
        },
      },
      ...(attrs.pipelines ? { effective_config: { service: { pipelines: attrs.pipelines } } } : {}),
    },
  });
}

async function createTestCollectors(esClient: any) {
  const groups: Array<{
    prefix: string;
    group?: string;
    groupName?: string;
    count: number;
    pipelines: (i: number) => Record<string, any>;
  }> = [
    {
      prefix: 'web',
      group: 'web-logs',
      groupName: 'Web Logs',
      count: 6,
      pipelines: (i) => (i < 3 ? { 'logs/access': {} } : { 'logs/error': {}, 'metrics/host': {} }),
    },
    {
      prefix: 'metrics',
      group: 'metrics-prod',
      groupName: 'Metrics Prod',
      count: 5,
      pipelines: () => ({ 'metrics/cpu': {} }),
    },
    {
      prefix: 'db',
      group: 'db-monitoring',
      groupName: 'DB Monitoring',
      count: 4,
      pipelines: () => ({ 'metrics/db': {}, 'traces/sql': {} }),
    },
    {
      prefix: 'edge',
      group: 'edge-proxies',
      groupName: 'Edge Proxies',
      count: 3,
      pipelines: () => ({ 'logs/proxy': {} }),
    },
    {
      prefix: 'ungrouped',
      count: 2,
      pipelines: () => ({ 'traces/http': {} }),
    },
  ];

  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      await createOpampCollector(esClient, `opamp-${g.prefix}-${i}`, {
        group: g.group,
        groupName: g.groupName,
        pipelines: g.pipelines(i),
      });
    }
  }
}

async function deleteAllOpampAgents(esClient: any) {
  await esClient.deleteByQuery({
    index: AGENTS_INDEX,
    refresh: true,
    query: { term: { type: 'OPAMP' } },
    ignore_unavailable: true,
  });
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  // Skip until the feature flag is enabled
  describe.skip('collector_groups', () => {
    before(async () => {
      await fleetAndAgents.setup();
    });

    after(async () => {
      await cleanFleetIndices(esClient);
    });

    describe('GET /agents/collector_groups', () => {
      before(async () => {
        await deleteAllOpampAgents(esClient);
        await createTestCollectors(esClient);
      });

      after(async () => {
        await deleteAllOpampAgents(esClient);
      });

      it('returns groups with correct structure and doc counts', async () => {
        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20')
          .expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.eql(5);

        const byGroup = new Map<string, any>(body.items.map((item: any) => [item.group, item]));

        expect(byGroup.get('web-logs').docCount).to.eql(6);
        expect(byGroup.get('web-logs').groupDisplayName).to.eql('Web Logs');
        expect(byGroup.get('metrics-prod').docCount).to.eql(5);
        expect(byGroup.get('db-monitoring').docCount).to.eql(4);
        expect(byGroup.get('edge-proxies').docCount).to.eql(3);

        const ungrouped = byGroup.get('others');
        expect(ungrouped.docCount).to.eql(2);
        expect(ungrouped.isUngrouped).to.eql(true);
      });

      it('returns correct signals derived from pipelines', async () => {
        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20')
          .expect(200);

        const byGroup = new Map<string, any>(body.items.map((item: any) => [item.group, item]));

        const webSignals = byGroup.get('web-logs').signals.sort();
        expect(webSignals).to.eql(['logs', 'metrics']);

        const metricsSignals = byGroup.get('metrics-prod').signals;
        expect(metricsSignals).to.eql(['metrics']);

        const dbSignals = byGroup.get('db-monitoring').signals.sort();
        expect(dbSignals).to.eql(['metrics', 'traces']);
      });

      it('paginates with afterKey cursor', async () => {
        const allGroups: string[] = [];

        // Page 1
        const { body: page1 } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=2')
          .expect(200);

        expect(page1.items.length).to.eql(2);
        expect(page1.afterKey).to.be.a('string');
        allGroups.push(...page1.items.map((item: any) => item.group));

        // Page 2
        const { body: page2 } = await supertest
          .get(
            `/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=2&afterKey=${encodeURIComponent(
              page1.afterKey
            )}`
          )
          .expect(200);

        expect(page2.items.length).to.eql(2);
        expect(page2.afterKey).to.be.a('string');
        allGroups.push(...page2.items.map((item: any) => item.group));

        // Page 3 (last page)
        const { body: page3 } = await supertest
          .get(
            `/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=2&afterKey=${encodeURIComponent(
              page2.afterKey
            )}`
          )
          .expect(200);

        expect(page3.items.length).to.be.lessThan(3);
        expect(page3.afterKey).to.be(undefined);
        allGroups.push(...page3.items.map((item: any) => item.group));

        // All 5 groups should be returned with no duplicates
        expect(allGroups.sort()).to.eql([
          'db-monitoring',
          'edge-proxies',
          'metrics-prod',
          'others',
          'web-logs',
        ]);
      });

      it('supports groupBy=config.name', async () => {
        await createOpampCollector(esClient, 'opamp-config-1', {
          configName: 'webserver-logs',
          configDescription: 'Webserver access and error logs',
          pipelines: { 'logs/access': {} },
        });
        await createOpampCollector(esClient, 'opamp-config-2', {
          configName: 'webserver-logs',
          configDescription: 'Webserver access and error logs',
          pipelines: { 'logs/error': {} },
        });

        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=config.name&perPage=100')
          .expect(200);

        expect(body.items).to.be.an('array');
        // All test agents (20 from beforeEach + 2 with configName) should appear
        // Agents with configName='webserver-logs' should form their own group
        const configGroup = body.items.find((item: any) => item.group === 'webserver-logs');
        expect(configGroup).to.be.ok();
        expect(configGroup.groupDisplayName).to.eql('Webserver access and error logs');
        expect(configGroup.docCount).to.eql(2);
      });

      it('filters by kuery', async () => {
        const { body } = await supertest
          .get(
            `/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20&kuery=${encodeURIComponent(
              'non_identifying_attributes.elastic.collector.group:web-logs'
            )}`
          )
          .expect(200);

        expect(body.items.length).to.eql(1);
        expect(body.items[0].group).to.eql('web-logs');
        expect(body.items[0].docCount).to.eql(6);
      });

      it('excludes unenrolled agents', async () => {
        await esClient.create({
          id: 'opamp-dead-1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          document: {
            active: false,
            type: 'OPAMP',
            policy_id: 'policy1',
            local_metadata: { host: { hostname: 'opamp-dead-1' } },
            user_provided_metadata: {},
            enrolled_at: new Date().toISOString(),
            unenrolled_at: new Date().toISOString(),
            last_checkin: new Date().toISOString(),
            last_checkin_status: 'online',
            non_identifying_attributes: {
              elastic: { collector: { group: 'dead-group', group_name: 'Dead Group' } },
            },
            effective_config: { service: { pipelines: { 'logs/dead': {} } } },
          },
        });

        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20')
          .expect(200);

        const groups = body.items.map((item: any) => item.group);
        expect(groups).to.not.contain('dead-group');
      });

      it('returns empty items when no collectors exist', async () => {
        await deleteAllOpampAgents(esClient);

        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20')
          .expect(200);

        expect(body.items).to.eql([]);
        expect(body.afterKey).to.be(undefined);
      });
    });

    describe('space awareness', () => {
      const apiClient = new SpaceTestApiClient(supertest);
      let TEST_SPACE_1: string;

      before(async () => {
        const spaces = getService('spaces');
        TEST_SPACE_1 = spaces.getDefaultTestSpace();
        await createTestSpace(providerContext, TEST_SPACE_1);
        await apiClient.postEnableSpaceAwareness();

        // Create OPAMP agents in default space
        await createOpampCollector(esClient, 'opamp-sa-default-1', {
          group: 'web-logs',
          groupName: 'Web Logs',
          pipelines: { 'logs/access': {} },
          namespaces: ['default'],
        });
        await createOpampCollector(esClient, 'opamp-sa-default-2', {
          group: 'web-logs',
          groupName: 'Web Logs',
          pipelines: { 'logs/error': {} },
          namespaces: ['default'],
        });
        await createOpampCollector(esClient, 'opamp-sa-default-3', {
          group: 'metrics-prod',
          groupName: 'Metrics Prod',
          pipelines: { 'metrics/cpu': {} },
          namespaces: ['default'],
        });

        // Create OPAMP agents in test space
        await createOpampCollector(esClient, 'opamp-sa-test-1', {
          group: 'db-monitoring',
          groupName: 'DB Monitoring',
          pipelines: { 'metrics/db': {} },
          namespaces: [TEST_SPACE_1],
        });
        await createOpampCollector(esClient, 'opamp-sa-test-2', {
          group: 'db-monitoring',
          groupName: 'DB Monitoring',
          pipelines: { 'traces/sql': {} },
          namespaces: [TEST_SPACE_1],
        });
        await createOpampCollector(esClient, 'opamp-sa-test-3', {
          group: 'edge-proxies',
          groupName: 'Edge Proxies',
          pipelines: { 'logs/proxy': {} },
          namespaces: [TEST_SPACE_1],
        });

        // Create agent visible in all spaces
        await createOpampCollector(esClient, 'opamp-sa-all-1', {
          group: 'shared-infra',
          groupName: 'Shared Infra',
          pipelines: { 'metrics/infra': {} },
          namespaces: ['*'],
        });
      });

      after(async () => {
        await cleanFleetIndices(esClient);
      });

      it('should return only groups from the default space', async () => {
        const { body } = await supertest
          .get('/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20')
          .expect(200);

        const groups = body.items.map((item: any) => item.group);
        expect(groups).to.contain('web-logs');
        expect(groups).to.contain('metrics-prod');
        expect(groups).to.contain('shared-infra');
        expect(groups).to.not.contain('db-monitoring');
        expect(groups).to.not.contain('edge-proxies');

        const webLogs = body.items.find((item: any) => item.group === 'web-logs');
        expect(webLogs.docCount).to.eql(2);
      });

      it('should return only groups from a custom space', async () => {
        const { body } = await supertest
          .get(
            `/s/${TEST_SPACE_1}/api/fleet/agents/collector_groups?groupBy=collector.group&perPage=20`
          )
          .expect(200);

        const groups = body.items.map((item: any) => item.group);
        expect(groups).to.contain('db-monitoring');
        expect(groups).to.contain('edge-proxies');
        expect(groups).to.contain('shared-infra');
        expect(groups).to.not.contain('web-logs');
        expect(groups).to.not.contain('metrics-prod');

        const dbMonitoring = body.items.find((item: any) => item.group === 'db-monitoring');
        expect(dbMonitoring.docCount).to.eql(2);
      });
    });
  });
}
