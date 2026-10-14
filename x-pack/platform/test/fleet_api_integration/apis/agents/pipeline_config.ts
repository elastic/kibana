/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

// Expected fingerprints — derived by hand from PIPELINE_CONFIG_RUNTIME_FIELD Painless script:
//   pipelines (sorted name) → sorted receivers | processors in config order | sorted exporters
//   service.extensions → sorted list
//   sections ['receivers','processors','exporters','connectors'] → sorted keys per section
//   all joined with ';'
const EXPECTED_FINGERPRINTS: Record<string, string> = {
  // pipeline: logs | receivers: otlp | exporters: otlphttp
  'basic-logs': 'pipe:logs[otlp||otlphttp];receivers:otlp;exporters:otlphttp',

  // pipelines: logs, metrics | receivers: hostmetrics+otlp (sorted) | exporters: otlphttp
  'logs-and-metrics':
    'pipe:logs[otlp||otlphttp];pipe:metrics[hostmetrics||otlphttp];receivers:hostmetrics,otlp;exporters:otlphttp',

  // pipelines: logs+metrics | receivers: otlp | processors: batch | exporters: otlphttp
  'batch-processor':
    'pipe:logs[otlp|batch|otlphttp];pipe:metrics[otlp|batch|otlphttp];receivers:otlp;processors:batch;exporters:otlphttp',

  // pipelines: metrics+traces | receivers: otlp | processors: batch | exporters: otlphttp | connectors: spanmetrics
  'spanmetrics-connector':
    'pipe:metrics[spanmetrics||otlphttp];pipe:traces[otlp|batch|spanmetrics];receivers:otlp;processors:batch;exporters:otlphttp;connectors:spanmetrics',

  // pipelines: logs+metrics (processors in config order: memory_limiter,batch) | extensions: health_check,zpages (sorted)
  // receivers: otlp | processors: batch,memory_limiter (sorted in top-level keys) | exporters: debug,otlphttp (sorted)
  extensions:
    'pipe:logs[otlp|memory_limiter,batch|debug,otlphttp];pipe:metrics[otlp|memory_limiter,batch|otlphttp];ext:health_check,zpages;receivers:otlp;processors:batch,memory_limiter;exporters:debug,otlphttp',
};

// Two collectors per group — different per-instance values (port numbers, endpoints, api keys)
// so effective_config_hash would differ, but pipeline_config should be the same within a group.
const CONFIG_GROUPS = [
  {
    label: 'basic-logs',
    configs: [0, 1].map((i) => ({
      receivers: {
        otlp: { protocols: { grpc: { endpoint: `0.0.0.0:${4317 + i}` } } },
      },
      exporters: {
        otlphttp: {
          endpoint: `https://collector-basic-logs-${i}.example.com:4318`,
          headers: { Authorization: `Bearer key-${i}` },
        },
      },
      service: {
        pipelines: {
          logs: { receivers: ['otlp'], processors: [], exporters: ['otlphttp'] },
        },
      },
    })),
  },
  {
    label: 'logs-and-metrics',
    configs: [0, 1].map((i) => ({
      receivers: {
        otlp: { protocols: { grpc: { endpoint: `0.0.0.0:${4317 + i}` } } },
        hostmetrics: { collection_interval: '30s', scrapers: { cpu: {}, memory: {} } },
      },
      exporters: {
        otlphttp: {
          endpoint: `https://collector-logs-metrics-${i}.example.com:4318`,
          headers: { Authorization: `Bearer key-${i}` },
        },
      },
      service: {
        pipelines: {
          logs: { receivers: ['otlp'], processors: [], exporters: ['otlphttp'] },
          metrics: { receivers: ['hostmetrics'], processors: [], exporters: ['otlphttp'] },
        },
      },
    })),
  },
  {
    label: 'batch-processor',
    configs: [0, 1].map((i) => ({
      receivers: {
        otlp: { protocols: { grpc: { endpoint: `0.0.0.0:${4317 + i}` } } },
      },
      processors: {
        batch: { send_batch_size: 1024 + i, timeout: '5s' },
      },
      exporters: {
        otlphttp: {
          endpoint: `https://collector-batch-${i}.example.com:4318`,
          headers: { Authorization: `Bearer key-${i}` },
        },
      },
      service: {
        pipelines: {
          logs: { receivers: ['otlp'], processors: ['batch'], exporters: ['otlphttp'] },
          metrics: { receivers: ['otlp'], processors: ['batch'], exporters: ['otlphttp'] },
        },
      },
    })),
  },
  {
    label: 'spanmetrics-connector',
    configs: [0, 1].map((i) => ({
      receivers: {
        otlp: { protocols: { grpc: { endpoint: `0.0.0.0:${4317 + i}` } } },
      },
      processors: {
        batch: { send_batch_size: 512 + i, timeout: '2s' },
      },
      exporters: {
        otlphttp: {
          endpoint: `https://collector-spanmetrics-${i}.example.com:4318`,
          headers: { Authorization: `Bearer key-${i}` },
        },
      },
      connectors: {
        spanmetrics: { histogram: { explicit: { buckets: ['100ms', '1s', '2s'] } } },
      },
      service: {
        pipelines: {
          traces: { receivers: ['otlp'], processors: ['batch'], exporters: ['spanmetrics'] },
          metrics: { receivers: ['spanmetrics'], processors: [], exporters: ['otlphttp'] },
        },
      },
    })),
  },
  {
    label: 'extensions',
    configs: [0, 1].map((i) => ({
      receivers: {
        otlp: { protocols: { grpc: { endpoint: `0.0.0.0:${4317 + i}` } } },
      },
      processors: {
        batch: { send_batch_size: 1024, timeout: '5s' },
        memory_limiter: { limit_mib: 512 + i },
      },
      exporters: {
        otlphttp: {
          endpoint: `https://collector-ext-${i}.example.com:4318`,
          headers: { Authorization: `Bearer key-${i}` },
        },
        debug: { verbosity: 'detailed' },
      },
      extensions: {
        health_check: { endpoint: `0.0.0.0:${13133 + i}` },
        zpages: { endpoint: `0.0.0.0:${55679 + i}` },
      },
      service: {
        extensions: ['health_check', 'zpages'],
        pipelines: {
          logs: {
            receivers: ['otlp'],
            processors: ['memory_limiter', 'batch'],
            exporters: ['otlphttp', 'debug'],
          },
          metrics: {
            receivers: ['otlp'],
            processors: ['memory_limiter', 'batch'],
            exporters: ['otlphttp'],
          },
        },
      },
    })),
  },
];

const TEST_TAG = 'fleet-api-integration-pipeline-config';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('pipeline_config runtime field', () => {
    const agentIds: string[] = [];

    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      for (const group of CONFIG_GROUPS) {
        for (let i = 0; i < group.configs.length; i++) {
          const id = `test-opamp-${group.label}-${i}`;
          agentIds.push(id);
          await es.index({
            id,
            index: AGENTS_INDEX,
            refresh: 'wait_for',
            document: {
              agent: { id, version: '9.0.0', type: 'otelcol' },
              access_api_key_id: 'api-key-opamp',
              active: true,
              policy_id: 'policy1',
              type: 'OPAMP',
              enrolled_at: new Date().toISOString(),
              last_checkin: new Date().toISOString(),
              last_checkin_status: 'online',
              tags: [TEST_TAG, group.label],
              identifying_attributes: {
                'service.instance.id': id,
                'service.name': 'otelcol',
                'service.version': '0.120.0',
              },
              non_identifying_attributes: {
                'elastic.display.name': `collector-${group.label}-${i}`,
                'host.name': `host-${group.label}-${i}.example.com`,
              },
              effective_config: group.configs[i],
              local_metadata: {
                elastic: { agent: { snapshot: false, upgradeable: false, version: '9.0.0' } },
                host: { hostname: `host-${group.label}-${i}.example.com` },
              },
              user_provided_metadata: {},
            },
          });
        }
      }

      // One regular (non-OpAMP) agent without effective_config — pipeline_config should be absent
      const regularId = 'test-regular-no-effective-config';
      agentIds.push(regularId);
      await es.index({
        id: regularId,
        index: AGENTS_INDEX,
        refresh: 'wait_for',
        document: {
          agent: { id: regularId, version: '9.0.0' },
          access_api_key_id: 'api-key-1',
          active: true,
          policy_id: 'policy1',
          type: 'PERMANENT',
          enrolled_at: new Date().toISOString(),
          last_checkin: new Date().toISOString(),
          tags: [TEST_TAG],
          local_metadata: {
            elastic: { agent: { snapshot: false, upgradeable: true, version: '9.0.0' } },
            host: { hostname: 'host-regular.example.com' },
          },
          user_provided_metadata: {},
        },
      });
    });

    after(async () => {
      await es.deleteByQuery({
        index: AGENTS_INDEX,
        refresh: true,
        query: { terms: { tags: [TEST_TAG] } },
      });
    });

    it('returns the correct pipeline_config fingerprint for each topology group', async () => {
      for (const group of CONFIG_GROUPS) {
        const kuery = encodeURIComponent(`tags:${TEST_TAG} AND tags:${group.label}`);
        const { body } = await supertest
          .get(`/api/fleet/agents?kuery=${kuery}&perPage=10`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.items).to.have.length(2);
        for (const agent of body.items) {
          expect(agent.pipeline_config).to.eql(
            EXPECTED_FINGERPRINTS[group.label],
            `group "${group.label}" agent "${agent.id}" has wrong pipeline_config`
          );
        }
      }
    });

    it('returns identical pipeline_config for two collectors in the same group despite different per-instance values', async () => {
      for (const group of CONFIG_GROUPS) {
        const kuery = encodeURIComponent(`tags:${TEST_TAG} AND tags:${group.label}`);
        const { body } = await supertest
          .get(`/api/fleet/agents?kuery=${kuery}&perPage=10`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.items).to.have.length(2);
        const [first, second] = body.items;
        expect(first.pipeline_config).to.eql(
          second.pipeline_config,
          `group "${group.label}": collectors should share pipeline_config despite different per-instance config values`
        );
      }
    });

    it('returns distinct pipeline_config fingerprints across different topology groups', async () => {
      const kuery = encodeURIComponent(`tags:${TEST_TAG} AND type:OPAMP`);
      const { body } = await supertest
        .get(`/api/fleet/agents?kuery=${kuery}&perPage=50`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const fingerprints = new Set(
        body.items.map((agent: { pipeline_config: string }) => agent.pipeline_config)
      );
      expect(fingerprints.size).to.eql(
        CONFIG_GROUPS.length,
        `expected ${CONFIG_GROUPS.length} distinct fingerprints, one per topology group`
      );
    });

    it('does not set pipeline_config on regular agents without effective_config', async () => {
      const kuery = encodeURIComponent(`tags:${TEST_TAG} AND type:PERMANENT`);
      const { body } = await supertest
        .get(`/api/fleet/agents?kuery=${kuery}&perPage=10`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(body.items).to.have.length(1);
      expect(body.items[0].pipeline_config).to.be(undefined);
    });
  });
}
