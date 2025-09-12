/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getCommonRequestHeader } from '../../../services/ml/common_api';
import { USER } from '../../../services/ml/security_common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');

  describe('ML Results Service - view_by endpoints', function () {
    const jobId = 'test-job';
    const basePath = '/internal/ml/results/view_by';

    const testJobConfig = {
      job_id: jobId,
      description: 'Test job',
      analysis_config: {
        bucket_span: '1h',
        detectors: [{ function: 'mean', field_name: 'responsetime' }],
        influencers: ['airline'],
      },
      data_description: { time_field: '@timestamp' },
      allow_lazy_open: true,
      model_snapshot_retention_days: 1,
      results_index_name: 'shared',
    };
    const testDatafeedConfig = {
      datafeed_id: `datafeed-${jobId}`,
      job_id: jobId,
      indices: ['ft_farequote'],
      query: { match_all: {} },
      delayed_data_check_config: { enabled: false },
    };

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createAndRunAnomalyDetectionLookbackJob(testJobConfig, testDatafeedConfig);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('scores_by_bucket returns max bucket scores per job over time', async () => {
      const requestBody = {
        jobIds: [jobId],
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        intervalMs: 3600000,
      };
      const { body, status } = await supertest
        .post(`${basePath}/scores_by_bucket`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);
      expect(body.results).to.be.an('object');
      expect(body.results).to.have.property(jobId);
      const jobResults = body.results[jobId];
      expect(jobResults).to.be.an('object');
    });

    it('should validate request body for scores_by_bucket', async () => {
      const invalidRequestBody = {
        // missing jobIds
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        intervalMs: 3600000,
      };
      const { body, status } = await supertest
        .post(`${basePath}/scores_by_bucket`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(invalidRequestBody);
      ml.api.assertResponseStatusCode(400, status, body);
      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.contain(
        '[request body.jobIds]: expected value of type [array] but got [undefined]'
      );
    });

    it('influencer_values_by_time returns per-value max influencer scores over time', async () => {
      const requestBody = {
        jobIds: [jobId],
        influencerFieldName: 'airline',
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        intervalMs: 3600000,
      };
      const { body, status } = await supertest
        .post(`${basePath}/influencer_values_by_time`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);
      expect(body.results).to.be.an('object');
      const valueKeys = Object.keys(body.results);
      expect(valueKeys.length).to.be.greaterThan(0);
      const firstValue = body.results[valueKeys[0]];
      expect(firstValue).to.be.an('object');
    });

    it('should validate request body for influencer_values_by_time', async () => {
      const invalidRequestBody = {
        // missing jobIds and influencerFieldName
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        intervalMs: 3600000,
      };
      const { body, status } = await supertest
        .post(`${basePath}/influencer_values_by_time`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(invalidRequestBody);
      ml.api.assertResponseStatusCode(400, status, body);
      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.contain(
        '[request body.jobIds]: expected value of type [array] but got [undefined]'
      );
    });

    it('should not allow fetching view_by results without required permissions', async () => {
      const requestBody = {
        jobIds: [jobId],
        influencerFieldName: 'airline',
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        intervalMs: 3600000,
      };
      const { body, status } = await supertest
        .post(`${basePath}/influencer_values_by_time`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, status, body);
      expect(body.error).to.eql('Forbidden');
    });
  });
}
