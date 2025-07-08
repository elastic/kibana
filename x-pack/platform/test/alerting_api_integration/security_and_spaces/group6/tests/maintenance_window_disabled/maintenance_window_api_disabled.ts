/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function maintenanceWindowApiDisabledTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('maintenance window API disabled', () => {
    const createParams = {
      title: 'test-maintenance-window',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: new Date().toISOString(),
        tzid: 'UTC',
        freq: 2, // weekly
      },
    };

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 404 when trying to create a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(createParams);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to get a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/some-id`)
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to update a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/some-id`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(createParams);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to delete a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/some-id`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to archive a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                space.id
              )}/internal/alerting/rules/maintenance_window/some-id/_archive`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to finish a maintenance window', async () => {
          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/some-id/_finish`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to find maintenance windows', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          expect(response.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          });
        });

        it('should return 404 when trying to get active maintenance windows', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/_active`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

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
