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

  describe('ML Results Service - top influencers endpoint', function () {
    const jobId = 'test-job';
    const basePath = '/internal/ml/results/top_influencers';

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

    it('returns top influencers for requested jobs and time range', async () => {
      const requestBody = {
        jobIds: [jobId],
        earliestMs: 1454889600000, // Feb 8, 2016 00:00:00 GMT
        latestMs: 1454976000000, // Feb 9, 2016 00:00:00 GMT
        maxFieldValues: 10,
        perPage: 10,
        page: 1,
      };
      const { body, status } = await supertest
        .post(basePath)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body).to.be.an('object');
      const keys = Object.keys(body);
      expect(keys.length).to.be.greaterThan(0);
      const firstKey = keys[0];
      expect(body[firstKey]).to.be.an('array');
      expect(body[firstKey].length).to.be.greaterThan(0);
      expect(body[firstKey][0]).to.have.property('influencerFieldValue');
      expect(body[firstKey][0]).to.have.property('maxAnomalyScore');
      expect(body[firstKey][0]).to.have.property('sumAnomalyScore');
    });

    it('should validate request body for top_influencers', async () => {
      const invalidRequestBody = {
        // missing jobIds and influencerFieldNames
        earliestMs: 0,
        latestMs: Date.now(),
        maxFieldValues: 10,
      };
      const { body, status } = await supertest
        .post(basePath)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(invalidRequestBody);
      expect(status).to.eql(400);
      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.contain(
        '[request body.jobIds]: expected value of type [array] but got [undefined]'
      );
    });

    it('should not allow fetching top influencers without required permissions', async () => {
      const requestBody = {
        jobIds: [jobId],
        earliestMs: 1454889600000,
        latestMs: 1454976000000,
        maxFieldValues: 10,
        perPage: 10,
        page: 1,
      };
      const { body, status } = await supertest
        .post(basePath)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, status, body);
      expect(body.error).to.eql('Forbidden');
    });
  });
}
