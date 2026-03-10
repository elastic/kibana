/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function unarchiveMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('unarchiveMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createRequestBody = {
      title: 'test-maintenance-window',
      enabled: false,
      schedule: {
        custom: {
          duration: '1d',
          start: new Date().toISOString(),
        },
      },
    };

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle unarchive maintenance window request appropriately', async () => {
          const { body: createdMaintenanceWindow } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createRequestBody);

          objectRemover.add(
            space.id,
            createdMaintenanceWindow.id,
            'rules/maintenance_window',
            'alerting',
            true
          );

          await supertest
            .post(
              `${getUrlPrefix(space.id)}/api/maintenance_window/${
                createdMaintenanceWindow.id
              }/_archive`
            )
            .set('kbn-xsrf', 'foo');

          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(space.id)}/api/maintenance_window/${
                createdMaintenanceWindow.id
              }/_unarchive`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /api/maintenance_window/${createdMaintenanceWindow.id}/_unarchive] is unauthorized for user, this action is granted by the Kibana privileges [write-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.status).eql('running');
              expect(
                moment
                  .utc(createdMaintenanceWindow.expirationDate)
                  .isAfter(response.body.expirationDate)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('unarchiving unexistent maintenance window returns 404', async () => {
      const space1 = UserAtSpaceScenarios[1].space.id;

      await supertest
        .post(`${getUrlPrefix(space1)}/api/maintenance_window/foobar-id/_unarchive`)
        .set('kbn-xsrf', 'foo')
        .send({ archive: true })
        .expect(404);
    });
  });
}
