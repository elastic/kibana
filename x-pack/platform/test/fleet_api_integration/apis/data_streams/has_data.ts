/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');

  const pkgName = 'datastreams';
  const pkgVersion = '0.1.0';
  const logsDataStream = `logs-${pkgName}.test_logs-default`;
  const metricsDataStream = `metrics-${pkgName}.test_metrics-default`;
  const logsPattern = `logs-${pkgName}.test_logs-*`;
  const metricsPattern = `metrics-${pkgName}.test_metrics-*`;

  const installPackage = async (name: string, version: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const getHasData = async (dataStreams: string, start: string) => {
    return await supertest
      .get(`/api/fleet/data_streams/data`)
      .query({ dataStreams, start })
      .set('kbn-xsrf', 'xxxx');
  };

  // A start bound comfortably before the seeded docs' @timestamp.
  const START_BEFORE_DOCS = '2014-01-01T00:00:00.000Z';
  // A start bound comfortably after the seeded docs' @timestamp.
  const START_AFTER_DOCS = '2020-01-01T00:00:00.000Z';

  const seedDoc = async (dataStream: string, type: string, dataset: string) => {
    await es.transport.request({
      method: 'POST',
      path: `/${dataStream}/_doc`,
      querystring: { refresh: 'true' },
      body: {
        '@timestamp': '2015-01-01',
        logs_test_name: 'test',
        data_stream: { dataset, namespace: 'default', type },
      },
    });
  };

  describe('data_streams_has_data', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await installPackage(pkgName, pkgVersion);
      await seedDoc(logsDataStream, 'logs', `${pkgName}.test_logs`);
    });

    after(async () => {
      for (const dataStream of [logsDataStream, metricsDataStream]) {
        try {
          await es.transport.request({
            method: 'DELETE',
            path: `/_data_stream/${dataStream}`,
          });
        } catch (e) {
          // Ignore if the data stream was never created
        }
      }
      await uninstallPackage(pkgName, pkgVersion);
    });

    it('returns true for a pattern that has documents in the time window', async () => {
      const { body, status } = await getHasData(logsPattern, START_BEFORE_DOCS);

      expect(status).to.eql(200);
      expect(body.results).to.eql({ [logsPattern]: true });
    });

    it('returns false when the documents fall outside the time window', async () => {
      const { body, status } = await getHasData(logsPattern, START_AFTER_DOCS);

      expect(status).to.eql(200);
      expect(body.results).to.eql({ [logsPattern]: false });
    });

    it('returns false for a pattern that matches no existing index', async () => {
      const { body, status } = await getHasData('logs-nonexistent.dataset-*', START_BEFORE_DOCS);

      expect(status).to.eql(200);
      expect(body.results).to.eql({ 'logs-nonexistent.dataset-*': false });
    });

    it('resolves each pattern independently when several are requested', async () => {
      const { body, status } = await getHasData(
        `${logsPattern},${metricsPattern}`,
        START_BEFORE_DOCS
      );

      expect(status).to.eql(200);
      // Only the logs data stream was seeded in `before`.
      expect(body.results).to.eql({
        [logsPattern]: true,
        [metricsPattern]: false,
      });
    });

    it('rejects a pattern that is not a logs-* or metrics-* wildcard', async () => {
      const { body, status } = await getHasData('bad-pattern', START_BEFORE_DOCS);

      expect(status).to.eql(400);
      expect(body.message).to.contain('Invalid index pattern: "bad-pattern"');
    });

    it('rejects a concrete system index name', async () => {
      const { body, status } = await getHasData('.security-7', START_BEFORE_DOCS);

      expect(status).to.eql(400);
      expect(body.message).to.contain('Invalid index pattern: ".security-7"');
    });

    it('rejects the whole request when any pattern in the list is invalid', async () => {
      const { body, status } = await getHasData(`${logsPattern},.security-7`, START_BEFORE_DOCS);

      expect(status).to.eql(400);
      expect(body.message).to.contain('Invalid index pattern: ".security-7"');
    });

    it('requires the dataStreams and start query params', async () => {
      const missingStart = await supertest
        .get(`/api/fleet/data_streams/data`)
        .query({ dataStreams: logsPattern })
        .set('kbn-xsrf', 'xxxx');
      expect(missingStart.status).to.eql(400);

      const missingDataStreams = await supertest
        .get(`/api/fleet/data_streams/data`)
        .query({ start: START_BEFORE_DOCS })
        .set('kbn-xsrf', 'xxxx');
      expect(missingDataStreams.status).to.eql(400);
    });

    it('rejects an over-long dataStreams value', async () => {
      // Exceeds the schema's 4096 maxLength — guards against an unbounded msearch fan-out.
      const tooManyPatterns = new Array(200).fill('logs-datastreams.test_logs-*').join(',');
      expect(tooManyPatterns.length).to.be.greaterThan(4096);

      const { status } = await getHasData(tooManyPatterns, START_BEFORE_DOCS);
      expect(status).to.eql(400);
    });

    it('rejects an over-long start value', async () => {
      const { status } = await getHasData(logsPattern, 'x'.repeat(100));
      expect(status).to.eql(400);
    });

    it('rejects a start value that is not a valid timestamp', async () => {
      const { status } = await getHasData(logsPattern, 'not-a-timestamp');
      expect(status).to.eql(400);
    });

    it('accepts a date-only start value', async () => {
      // Date.parse accepts more than strict ISO8601; the route intentionally allows any form
      // ES can interpret as a date bound.
      const { status } = await getHasData(logsPattern, '2015-01-01');
      expect(status).to.eql(200);
    });
  });
}
