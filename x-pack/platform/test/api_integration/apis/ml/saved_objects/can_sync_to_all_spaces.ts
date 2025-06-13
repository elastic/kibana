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

  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/internal/ml/saved_objects/can_sync_to_all_spaces`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET saved_objects/can_sync_to_all_spaces', () => {
    beforeEach(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    afterEach(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('user can sync to all spaces', async () => {
      const body = await runRequest(USER.ML_POWERUSER, 200);
      expect(body).to.eql({ canSync: true });
    });
    it('user can not sync to all spaces', async () => {
      const body = await runRequest(USER.ML_POWERUSER_SPACE1, 200);
      expect(body).to.eql({ canSync: false });
    });
  });
};
