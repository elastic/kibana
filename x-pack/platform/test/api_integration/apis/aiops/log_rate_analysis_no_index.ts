/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { getLogRateAnalysisTestData, API_VERSIONS } from './test_data';
import { getErrorActions } from './test_helpers';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('POST /internal/aiops/log_rate_analysis - no index', () => {
    API_VERSIONS.forEach((apiVersion) => {
      getLogRateAnalysisTestData<typeof apiVersion>().forEach((testData) => {
        describe(`with v${apiVersion} - ${testData.testName}`, () => {
          it('should return an error for non existing index without streaming', async () => {
            const resp = await supertest
              .post(`/internal/aiops/log_rate_analysis`)
              .set('kbn-xsrf', 'kibana')
              .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
              .send({
                ...testData.requestBody,
                index: 'does_not_exist',
              })
              .expect(200);

            const chunks: string[] = resp.body.toString().split('\n');

            expect(chunks.length).to.eql(
              testData.expected.noIndexChunksLength,
              `Expected 'noIndexChunksLength' to be ${testData.expected.noIndexChunksLength}, got ${chunks.length}.`
            );

            const lastChunk = chunks.pop();
            expect(lastChunk).to.be('');

            let data: any[] = [];

            expect(() => {
              data = chunks.map((c) => JSON.parse(c));
            }).not.to.throwError();

            expect(data.length).to.eql(
              testData.expected.noIndexActionsLength,
              `Expected 'noIndexActionsLength' to be ${testData.expected.noIndexActionsLength}, got ${data.length}.`
            );
            data.forEach((d) => {
              expect(typeof d.type).to.be('string');
            });

            const errorActions = getErrorActions(data);
            expect(errorActions.length).to.be(1);

            expect(errorActions[0].payload).to.be('Failed to fetch index information.');
          });
        });
      });
    });
  });
};
