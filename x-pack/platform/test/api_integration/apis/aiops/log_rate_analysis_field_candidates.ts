/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AiopsLogRateAnalysisSchema } from '@kbn/aiops-log-rate-analysis/api/schema';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FetchFieldCandidatesResponse } from '@kbn/aiops-log-rate-analysis/queries/fetch_field_candidates';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { getLogRateAnalysisTestData } from './test_data';

export default ({ getService }: FtrProviderContext) => {
  const aiops = getService('aiops');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('POST /internal/aiops/log_rate_analysis/field_candidates', () => {
    getLogRateAnalysisTestData<'3'>().forEach((testData) => {
      describe(`with ${testData.testName}`, () => {
        before(async () => {
          if (testData.esArchive) {
            await esArchiver.loadIfNeeded(testData.esArchive);
          } else if (testData.dataGenerator) {
            await aiops.logRateAnalysisDataGenerator.generateData(testData.dataGenerator);
          }
        });

        after(async () => {
          if (testData.esArchive) {
            await esArchiver.unload(testData.esArchive);
          } else if (testData.dataGenerator) {
            await aiops.logRateAnalysisDataGenerator.removeGeneratedData(testData.dataGenerator);
          }
        });

        async function assertFieldCandidates(data: FetchFieldCandidatesResponse) {
          expect(data).to.eql(
            testData.expected.fieldCandidates,
            `Expected fieldCandidates to be ${JSON.stringify(
              testData.expected.fieldCandidates
            )}, got ${JSON.stringify(data)}`
          );
        }

        async function requestFieldCandidates(body: AiopsLogRateAnalysisSchema<'3'>) {
          const resp = await supertest
            .post(`/internal/aiops/log_rate_analysis/field_candidates`)
            .set('kbn-xsrf', 'kibana')
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send(body)
            .expect(200);

          await assertFieldCandidates(resp.body);
        }

        it('should return field candidates', async () => {
          await requestFieldCandidates(testData.requestBody);
        });
      });
    });
  });
};
