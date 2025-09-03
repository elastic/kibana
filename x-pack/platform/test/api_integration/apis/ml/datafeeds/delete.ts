/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
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

  async function deleteDatafeed(
    datafeedId: string,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .delete(`${space ? `/s/${space}` : ''}/internal/ml/datafeeds/${datafeedId}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('delete datafeeds with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should delete datafeed with correct space', async () => {
      await deleteDatafeed(datafeedIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 200, idSpace1);

      const exists = await ml.api.datafeedExist(datafeedIdSpace1);

      expect(exists).to.eql(false, `expected datafeed exists to be false (got ${exists})`);
    });

    it('should not delete datafeed with incorrect space', async () => {
      await deleteDatafeed(datafeedIdSpace1, USER.ML_POWERUSER_ALL_SPACES, 404, idSpace2);
    });

    it('should not be deletable by ml viewer user', async () => {
      await deleteDatafeed(datafeedIdSpace1, USER.ML_VIEWER_ALL_SPACES, 403, idSpace1);
    });
  });
};
