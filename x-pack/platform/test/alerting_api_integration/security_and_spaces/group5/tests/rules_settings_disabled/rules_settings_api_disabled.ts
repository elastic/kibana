/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function rulesSettingsApiDisabledTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('rules settings API disabled', () => {
    const flappingSettingsParams = {
      enabled: true,
      look_back_window: 10,
      status_change_threshold: 5,
    };

    const queryDelaySettingsParams = {
      delay: 30,
    };

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 404 when trying to get flapping settings', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to update flapping settings', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(flappingSettingsParams);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to get query delay settings', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_query_delay`)
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to update query delay settings', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_query_delay`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(queryDelaySettingsParams);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });
      });
    }
  });
}
