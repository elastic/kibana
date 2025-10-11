/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DATAFEED_STATE } from '@kbn/ml-plugin/common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  const farequoteMappings: estypes.MappingTypeMapping = {
    properties: {
      '@timestamp': {
        type: 'date',
      },
      airline: {
        type: 'keyword',
      },
      responsetime: {
        type: 'float',
      },
    },
  };

  async function startDatafeed(
    datafeedConfig: estypes.MlStartDatafeedRequest,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { datafeed_id: datafeedId, ...requestBody } = datafeedConfig;
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/datafeeds/${datafeedId}/_start`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  async function stopDatafeed(
    datafeedConfig: estypes.MlStopDatafeedRequest,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { datafeed_id: datafeedId, ...requestBody } = datafeedConfig;
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/datafeeds/${datafeedId}/_stop`)
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
      await ml.api.createIndex('ft_farequote', farequoteMappings);
      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);
      await ml.api.openAnomalyDetectionJob(jobIdSpace1);
      await ml.testResources.setKibanaTimeZoneToUTC();
    });
    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('ft_farequote');
      await ml.testResources.cleanMLSavedObjects();
    });
    afterEach(async () => {
      try {
        await stopDatafeed(
          { datafeed_id: datafeedIdSpace1, force: true },
          USER.ML_POWERUSER_ALL_SPACES,
          200,
          idSpace1
        );
      } catch (error) {
        // ignore
      }
    });

    it('should start datafeed with correct space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );
    });

    it('should not start datafeed with incorrect space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        404,
        idSpace2
      );
    });

    it('should not be started by ml viewer user', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_VIEWER_ALL_SPACES,
        403,
        idSpace1
      );
    });

    it('should stop datafeed with correct space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED, idSpace1);

      await stopDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED, idSpace1);
    });

    it('should force stop datafeed with correct space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED, idSpace1);

      await stopDatafeed(
        { datafeed_id: datafeedIdSpace1, force: true },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED, idSpace1);
    });

    it('should not stop datafeed with incorrect space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED, idSpace1);

      await stopDatafeed(
        { datafeed_id: datafeedIdSpace1, force: true },
        USER.ML_POWERUSER_ALL_SPACES,
        404,
        idSpace2
      );
    });

    it('should not stop datafeed by ml viewer user', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForInternalDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED, idSpace1);

      await stopDatafeed(
        { datafeed_id: datafeedIdSpace1, force: true },
        USER.ML_VIEWER_ALL_SPACES,
        403,
        idSpace1
      );
    });
  });
};
