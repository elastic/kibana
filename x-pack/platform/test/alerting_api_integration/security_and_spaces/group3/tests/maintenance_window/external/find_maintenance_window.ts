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

export default function findMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const start = new Date();
  const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

  describe('findMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createRequestBody = {
      title: 'test-maintenance-window',
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
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should find all maintenance windows correctly', async () => {
          const { body: createdMaintenanceWindow1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createRequestBody);

          objectRemover.add(
            space.id,
            createdMaintenanceWindow1.id,
            'rules/maintenance_window',
            'alerting',
            true
          );

          const { body: createdMaintenanceWindow2 } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createRequestBody);

          objectRemover.add(
            space.id,
            createdMaintenanceWindow2.id,
            'rules/maintenance_window',
            'alerting',
            true
          );

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/maintenance_window/_find`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /api/maintenance_window/_find] is unauthorized for user, this action is granted by the Kibana privileges [read-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.maintenanceWindows.length).to.eql(2);

              const maintenanceWindow = response.body.maintenanceWindows[0];

              expect(maintenanceWindow.title).to.eql('test-maintenance-window');
              expect(maintenanceWindow.status).to.eql('upcoming');
              expect(maintenanceWindow.enabled).to.eql(true);

              expect(maintenanceWindow.scope.alerting.query.kql).to.eql("_id: '1234'");

              expect(maintenanceWindow.created_by).to.eql('elastic');
              expect(maintenanceWindow.updated_by).to.eql('elastic');

              expect(maintenanceWindow.schedule.custom.duration).to.eql('1m');
              expect(maintenanceWindow.schedule.custom.start).to.eql(start.toISOString());
              expect(maintenanceWindow.schedule.custom.recurring.every).to.eql('2d');
              expect(maintenanceWindow.schedule.custom.recurring.end).to.eql(end.toISOString());
              expect(maintenanceWindow.schedule.custom.recurring.onWeekDay).to.eql(['MO', 'FR']);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should find maintenance window by title', async () => {
      const { body: createdMaintenanceWindow1 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({ ...createRequestBody, title: 'foobar' });

      if (createdMaintenanceWindow1.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow1.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const { body: createdMaintenanceWindow2 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (createdMaintenanceWindow2.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow2.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const response = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?title=foobar`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(response.statusCode).to.eql(200);
      expect(response.body.maintenanceWindows.length).to.eql(1);
      expect(response.body.maintenanceWindows[0].title).to.eql('foobar');
    });

    it('should find maintenance window by creator', async () => {
      const { body: createdMaintenanceWindow1 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({ ...createRequestBody, title: 'foobar' });

      if (createdMaintenanceWindow1.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow1.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const { body: createdMaintenanceWindow2 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (createdMaintenanceWindow2.id) {
        objectRemover.add(
          'space1',
          createdMaintenanceWindow2.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const response = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?created_by=elastic`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(response.statusCode).to.eql(200);
      expect(response.body.maintenanceWindows.length).to.eql(2);

      expect(response.body.maintenanceWindows[0].created_by).to.eql('elastic');
      expect(response.body.maintenanceWindows[1].created_by).to.eql('elastic');
    });

    it('should find maintenance window by status', async () => {
      const { body: archiveMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({ ...createRequestBody, title: 'foobar' });

      await supertest
        .post(
          `${getUrlPrefix('space1')}/api/maintenance_window/${archiveMaintenanceWindow.id}/_archive`
        )
        .set('kbn-xsrf', 'foo')
        .send({ archive: true })
        .expect(200);

      const { body: upcomingMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (archiveMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          archiveMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      if (upcomingMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          upcomingMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const findArchivedResponse = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?status=archived`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(findArchivedResponse.statusCode).to.eql(200);
      expect(findArchivedResponse.body.maintenanceWindows.length).to.eql(1);
      expect(findArchivedResponse.body.maintenanceWindows[0].status).to.eql('archived');

      const findUpcomingResponse = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?status=upcoming`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(findUpcomingResponse.statusCode).to.eql(200);
      expect(findUpcomingResponse.body.maintenanceWindows.length).to.eql(1);
      expect(findUpcomingResponse.body.maintenanceWindows[0].status).to.eql('upcoming');
    });

    it('should find maintenance windows by disabled status', async () => {
      const { body: disabledMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({ ...createRequestBody, enabled: false, title: 'test-disabled-maintenance-window' });

      if (disabledMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          disabledMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const { body: enabledMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      if (enabledMaintenanceWindow.id) {
        objectRemover.add(
          'space1',
          enabledMaintenanceWindow.id,
          'rules/maintenance_window',
          'alerting',
          true
        );
      }

      const findDisabledResponse = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?status=disabled`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(findDisabledResponse.statusCode).to.eql(200);
      expect(findDisabledResponse.body.maintenanceWindows.length).to.eql(1);
      expect(findDisabledResponse.body.maintenanceWindows[0].title).to.eql(
        'test-disabled-maintenance-window'
      );
      expect(findDisabledResponse.body.maintenanceWindows[0].status).to.eql('disabled');
    });

    it('should find maintenance window with pagination', async () => {
      const { body: createdMaintenanceWindow1 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      objectRemover.add(
        'space1',
        createdMaintenanceWindow1.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const { body: createdMaintenanceWindow2 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createRequestBody);

      objectRemover.add(
        'space1',
        createdMaintenanceWindow2.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const response = await supertest
        .get(`${getUrlPrefix('space1')}/api/maintenance_window/_find?page=1&per_page=1`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(response.body.total).to.eql(2);
      expect(response.body.maintenanceWindows.length).to.eql(1);
    });
  });
}
