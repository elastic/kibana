/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function createMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const start = new Date();
  const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
  const newEnd = new Date(new Date(start).setMonth(start.getMonth() + 2));

  describe('updateMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createRequestBody = {
      title: 'test-maintenance-window',
      enabled: false,
      schedule: {
        custom: {
          duration: '1m',
          start: start.toISOString(),
          recurring: {
            every: '2d',
            end: end.toISOString(),
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      scope: {
        alerting: {
          query: {
            kql: "_id: '1234'",
          },
        },
      },
    };

    const updateRequestBody = {
      title: 'test-UPDATE-maintenance-window',
      enabled: true,
      schedule: {
        custom: {
          duration: '2m',
          start: end.toISOString(),
          recurring: {
            every: '2d',
            end: newEnd.toISOString(),
            onWeekDay: ['WE'],
          },
        },
      },
      scope: {
        alerting: {
          query: {
            kql: "_id: 'foobar'",
          },
        },
      },
    };
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle an update maintenance window request appropriately', async () => {
          const { body: createdMaintenanceWindow } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createRequestBody);

          if (createdMaintenanceWindow.id) {
            objectRemover.add(
              space.id,
              createdMaintenanceWindow.id,
              'rules/maintenance_window',
              'alerting',
              true
            );
          }

          const response = await supertestWithoutAuth
            .patch(
              `${getUrlPrefix(space.id)}/api/maintenance_window/${createdMaintenanceWindow.id}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updateRequestBody);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [PATCH /api/maintenance_window/${createdMaintenanceWindow.id}] is unauthorized for user, this action is granted by the Kibana privileges [write-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.title).to.eql('test-UPDATE-maintenance-window');
              expect(response.body.enabled).to.eql(true);
              expect(response.body.scope.alerting.query.kql).to.eql("_id: 'foobar'");
              expect(response.body.created_by).to.eql('elastic');
              expect(response.body.updated_by).to.eql(scenario.user.username);
              expect(response.body.schedule.custom.duration).to.eql('2m');
              expect(response.body.schedule.custom.start).to.eql(end.toISOString());
              expect(response.body.schedule.custom.recurring.every).to.eql('2d');
              expect(response.body.schedule.custom.recurring.end).to.eql(newEnd.toISOString());
              expect(response.body.schedule.custom.recurring.onWeekDay).to.eql(['WE']);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should throw if updating maintenance window with invalid scoped query', async () => {
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (createdMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      await supertest
        .patch(`${getUrlPrefix('space1')}/api/maintenance_window/${createdMaintenanceWindow.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...updateRequestBody,
          scope: {
            query: {
              kql: 'invalid_kql:',
            },
          },
        })
        .expect(400);
    });

    it('should throw if updating maintenance window with unknown field', async () => {
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (createdMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      await supertest
        .patch(`${getUrlPrefix('space1')}/api/maintenance_window/${createdMaintenanceWindow.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...updateRequestBody,
          foo: 'bar',
        })
        .expect(400);
    });
  });
}
