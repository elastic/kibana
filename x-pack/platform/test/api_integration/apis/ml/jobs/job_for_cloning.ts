/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed, Job } from '@kbn/ml-plugin/common';
import { JOB_STATE } from '@kbn/ml-plugin/common';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const jobIdSpace1 = 'fq_single_space1';
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function jobForCloning(
    jobId: string,
    retainCreatedBy = false,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const requestBody = { jobId, retainCreatedBy };
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/jobs/job_for_cloning`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('retrieve job for cloning', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      jobConfig.custom_settings = { created_by: 'user1' };
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);

      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);
      await ml.api.openAnomalyDetectionJob(jobIdSpace1);
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.startDatafeed(datafeedIdSpace1);
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
    });
    after(async () => {
      await ml.api.stopDatafeed(datafeedIdSpace1);
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('ft_farequote');
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should retrieve a job for cloning without retaining created by', async () => {
      const originJobResponse = await ml.api.getAnomalyDetectionJob(jobIdSpace1);
      const originJob = JSON.parse(originJobResponse.text);

      expect(originJob.jobs[0]).to.have.property('job_id', jobIdSpace1);
      expect(originJob.jobs[0]).to.have.property('job_type');
      expect(originJob.jobs[0]).to.have.property('job_version');
      expect(originJob.jobs[0]).to.have.property('create_time');
      expect(originJob.jobs[0]).to.have.property('datafeed_config');
      expect(originJob.jobs[0]).not.to.have.property('datafeed');
      expect(originJob.jobs[0]).to.have.property('custom_settings');
      expect(originJob.jobs[0].custom_settings).to.have.property('created_by');
      expect(originJob.jobs[0].custom_settings.created_by).to.eql('user1');

      const jobCloneResponse: { job: Job; datafeed: Datafeed } = await jobForCloning(
        jobIdSpace1,
        false,
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      expect(jobCloneResponse.job).to.have.property('job_id', jobIdSpace1);
      expect(jobCloneResponse.job).not.to.have.property('job_type');
      expect(jobCloneResponse.job).not.to.have.property('job_version');
      expect(jobCloneResponse.job).not.to.have.property('create_time');
      expect(jobCloneResponse.job).not.to.have.property('datafeed_config');
      expect(jobCloneResponse).to.have.property('datafeed');
      expect(jobCloneResponse.job).to.have.property('custom_settings');
      expect(jobCloneResponse.job.custom_settings).not.to.have.property('created_by');
    });

    it('should retrieve a job for cloning and retain created_by field', async () => {
      const jobCloneResponse: { job: Job; datafeed: Datafeed } = await jobForCloning(
        jobIdSpace1,
        true,
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      expect(jobCloneResponse.job).to.have.property('custom_settings');
      expect(jobCloneResponse.job.custom_settings).to.have.property('created_by');
      expect(jobCloneResponse.job.custom_settings.created_by).to.eql('user1');
    });

    it('should retrieve a job for cloning by ml viewer user', async () => {
      const jobCloneResponse = await jobForCloning(
        jobIdSpace1,
        true,
        USER.ML_VIEWER_ALL_SPACES,
        200,
        idSpace1
      );

      expect(jobCloneResponse.job).to.have.property('job_id', jobIdSpace1);
      expect(jobCloneResponse.job).not.to.have.property('job_type');
      expect(jobCloneResponse.job).not.to.have.property('job_version');
      expect(jobCloneResponse.job).not.to.have.property('create_time');
      expect(jobCloneResponse.job).not.to.have.property('datafeed_config');
      expect(jobCloneResponse).to.have.property('datafeed');
      expect(jobCloneResponse.job).to.have.property('custom_settings');
      expect(jobCloneResponse.job.custom_settings).to.have.property('created_by');
      expect(jobCloneResponse.job.custom_settings.created_by).to.eql('user1');
    });

    it('should not retrieve a job for cloning by ml unauthorized user', async () => {
      await jobForCloning(jobIdSpace1, true, USER.ML_UNAUTHORIZED, 403, idSpace1);
    });

    it('should not retrieve a job for cloning by ml disabled user', async () => {
      await jobForCloning(jobIdSpace1, true, USER.ML_DISABLED, 403, idSpace1);
    });

    it('should not retrieve a job for cloning with incorrect space', async () => {
      await jobForCloning(jobIdSpace1, true, USER.ML_POWERUSER_ALL_SPACES, 404, idSpace2);
    });
  });
};
