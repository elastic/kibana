/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
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

  async function forceStopAndCloseJob(
    jobId: string,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const requestBody = { jobId };
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/jobs/force_stop_and_close_job`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('starts and stops datafeeds', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);
      await ml.api.openAnomalyDetectionJob(jobIdSpace1);
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.startDatafeed(datafeedIdSpace1);
    });
    after(async () => {
      await ml.api.stopDatafeed(datafeedIdSpace1);
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('ft_farequote');
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should not stop and close the job by ml viewer user', async () => {
      await forceStopAndCloseJob(jobIdSpace1, USER.ML_VIEWER_ALL_SPACES, 403, idSpace1);
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
    });

    it('should not stop and close the job with incorrect space', async () => {
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);

      await forceStopAndCloseJob(jobIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 404, idSpace2);
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
    });

    it('should force stop and close the job with correct space', async () => {
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);

      await forceStopAndCloseJob(jobIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 200, idSpace1);

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.CLOSED);
    });
  });
};
