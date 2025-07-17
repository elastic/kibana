/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import allPipelinesResponse from '../../fixtures/logstash/pipelines.json';
import pipelineResponse from '../../fixtures/logstash/pipeline.json';
import vertexResponse from '../../fixtures/logstash/vertex.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Pipelines',
    archiveRoot: 'x-pack/platform/test/monitoring_api_integration/archives/logstash/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-03-01T18:03:00.000Z',
    max: '2023-03-01T18:06:40.000Z',
  };

  testRunner(() => {
    it('should return paginated pipelines', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/pipelines')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          sort: { field: 'id', direction: 'asc' },
          pagination: { size: 1, index: 0 },
        })
        .expect(200);

      expect(body).to.eql(allPipelinesResponse);
    });

    it('should get all pipelines after enough pagination', async () => {
      async function getIds(page: number) {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/pipelines')
          .set('kbn-xsrf', 'xxx')
          .send({
            timeRange,
            sort: { field: 'id', direction: 'asc' },
            pagination: { size: 1, index: page },
          })
          .expect(200);

        return body.pipelines;
      }

      const ids = [...(await getIds(0)), ...(await getIds(1))];
      expect(ids.length).to.be(2);
    });

    it('should not error out if there is missing data for part of the time series', async () => {
      await supertest
        .post('/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/pipelines')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange: { min: timeRange.min, max: '2023-03-01T18:15:40.000Z' },
          pagination: { size: 1, index: 1 },
          sort: { field: 'logstash_cluster_pipeline_throughput', direction: 'asc' },
        })
        .expect(200);
    });

    it('should return pipeline details', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/pipeline/pipeline-with-memory-queue'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(pipelineResponse);
    });

    it('should return vertex details', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/pipeline/pipeline-with-memory-queue'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          detailVertexId: '635a080aacc8700059852859da284a9cb92cb78a6d7112fbf55e441e51b6658a',
        })
        .expect(200);

      expect(body).to.eql(vertexResponse);
    });
  });
}
