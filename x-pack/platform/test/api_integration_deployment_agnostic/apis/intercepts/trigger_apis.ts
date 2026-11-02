/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { interceptTriggerRecordSavedObject } from '@kbn/intercepts-plugin/server/saved_objects';
import { TRIGGER_INFO_API_ROUTE } from '@kbn/intercepts-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');

  describe('Intercept Trigger APIs', function () {
    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: [interceptTriggerRecordSavedObject.name],
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({
        types: [interceptTriggerRecordSavedObject.name],
      });
    });

    describe(`POST ${TRIGGER_INFO_API_ROUTE}`, () => {
      it('should return 204 when no trigger info exists', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          useCookieHeader: true, // favorite only works with Cookie header
          withInternalHeaders: true,
        });

        const response = await supertest
          .post(TRIGGER_INFO_API_ROUTE)
          .send({ triggerId: 'non-existent-trigger' })
          .expect(204);

        expect(response.body).to.be.empty();
      });

      it('should return 200 with trigger info when it exists', async () => {
        const triggerId = 'test-trigger';
        const now = new Date().toISOString();
        const interval = '1h';

        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          useCookieHeader: true, // denotes authenticated user
          withInternalHeaders: true,
        });

        await kibanaServer.savedObjects.create({
          id: triggerId,
          type: interceptTriggerRecordSavedObject.name,
          overwrite: true,
          attributes: {
            firstRegisteredAt: now,
            triggerAfter: interval,
            recurrent: true,
            installedOn: '9.1.0',
          },
        });

        const response = await supertest
          .post(TRIGGER_INFO_API_ROUTE)
          .send({ triggerId })
          .expect(200);

        expect(response.body).to.have.property('registeredAt', now);
        expect(response.body).to.have.property('triggerIntervalInMs', 3600000); // 1h in ms
        expect(response.body).to.have.property('recurrent', true);
      });
    });
  });
}
