/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import overviewFixtureGreenPlatinum from './fixtures/overview_green_platinum.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('overview - metricbeat and package', () => {
    ['mb', 'package'].forEach((source) => {
      describe(`overview ${source}`, () => {
        describe('with green platinum cluster', () => {
          const archive = `x-pack/test/functional/es_archives/monitoring/singlecluster_green_platinum_${source}`;
          const timeRange = {
            min: '2018-02-13T17:04:50.000Z',
            max: '2018-02-13T17:51:55.000Z',
          };

          before('load clusters archive', () => {
            return setup(archive);
          });

          after('unload clusters archive', async () => {
            return tearDown(archive);
          });

          it('should summarize elasticsearch with metrics', async () => {
            const { body } = await supertest
              .post('/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/elasticsearch')
              .set('kbn-xsrf', 'xxx')
              .send({ timeRange })
              .expect(200);
            expect(body).to.eql(overviewFixtureGreenPlatinum);
          });
        });
      });
    });
  });
}
