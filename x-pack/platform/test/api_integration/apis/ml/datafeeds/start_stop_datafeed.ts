/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATAFEED_STATE } from '@kbn/ml-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const jobIdSpace1 = 'fq_single_space1';
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  interface StartDatafeedConfig {
    datafeed_id: string;
    start?: number | string;
    end?: number | string;
    timeout?: number;
  }

  interface FarequoteTimeAggs {
    min_time: estypes.AggregationsMinAggregate;
    max_time: estypes.AggregationsMaxAggregate;
  }

  async function getFarequoteTimeRange() {
    const { aggregations } = await es.search<unknown, FarequoteTimeAggs>({
      index: 'ft_farequote',
      size: 0,
      track_total_hits: false,
      aggs: {
        min_time: { min: { field: '@timestamp' } },
        max_time: { max: { field: '@timestamp' } },
      },
    });

    const minValue = aggregations?.min_time?.value;
    const maxValue = aggregations?.max_time?.value;

    if (minValue == null || maxValue == null) {
      throw new Error('ft_farequote has no @timestamp data');
    }

    return {
      minTime: minValue,
      maxTime: maxValue,
    };
  }

  async function startDatafeed(
    datafeedConfig: StartDatafeedConfig,
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
    datafeedId: string,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/internal/ml/datafeeds/${datafeedId}/_stop`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));

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
    });
    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('ft_farequote');
      await ml.testResources.cleanMLSavedObjects();
    });
    afterEach(async () => {
      await ml.api.stopDatafeed(datafeedIdSpace1);
    });

    it('should start datafeed with correct space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
    });

    it('should not start datafeed with incorrect space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        404,
        idSpace2
      );
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should not start datafeed by ml viewer user', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_VIEWER_ALL_SPACES,
        403,
        idSpace1
      );
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should stop datafeed with correct space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);

      await stopDatafeed(datafeedIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 200, idSpace1);

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should not stop datafeed with incorrect space', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);

      await stopDatafeed(datafeedIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 404, idSpace2);

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
    });

    it('should not stop datafeed by ml viewer user', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1 },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);

      await stopDatafeed(datafeedIdSpace1, USER.ML_VIEWER_ALL_SPACES, 403, idSpace1);

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
    });

    it('should not start with invalid start and stop params', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1, start: 100, end: 0 },
        USER.ML_POWERUSER_ALL_SPACES,
        400,
        idSpace1
      );
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should not start with invalid start param value', async () => {
      await startDatafeed(
        { datafeed_id: datafeedIdSpace1, start: 9999999999999999 },
        USER.ML_POWERUSER_ALL_SPACES,
        400,
        idSpace1
      );
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should not stop datafeed with only start param', async () => {
      const { minTime: start } = await getFarequoteTimeRange();

      await startDatafeed(
        {
          datafeed_id: datafeedIdSpace1,
          start,
        },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
    });

    it('should stop datafeed with start and stop params', async () => {
      const { minTime: start, maxTime } = await getFarequoteTimeRange();
      const end = maxTime + 60000; // +1 minute buffer

      await startDatafeed(
        {
          datafeed_id: datafeedIdSpace1,
          start,
          end,
        },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });
  });
};
