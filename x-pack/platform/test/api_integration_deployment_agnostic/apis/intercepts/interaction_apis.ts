/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TRIGGER_USER_INTERACTION_METADATA_API_ROUTE } from '@kbn/intercepts-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('Intercept User Interaction APIs', function () {
    describe(`GET ${TRIGGER_USER_INTERACTION_METADATA_API_ROUTE}`, () => {
      it('should return 200 with empty object when no interaction exists', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          useCookieHeader: true, // denotes authenticated user
          withInternalHeaders: true,
        });

        const response = await supertest
          .get(TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', 'test-trigger'))
          .expect(200);

        expect(response.body).to.eql({});
      });
    });

    describe(`POST ${TRIGGER_USER_INTERACTION_METADATA_API_ROUTE}`, () => {
      it('should successfully record intercept interaction and return the last saved value', async () => {
        const supertest = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          useCookieHeader: true, // denotes authenticated user
          withInternalHeaders: true,
        });

        const interactionRecord = { lastInteractedInterceptId: 1 };

        await supertest
          .post(TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', 'test-trigger'))
          .send(interactionRecord)
          .expect(201);

        const response = await supertest
          .get(TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', 'test-trigger'))
          .expect(200);

        expect(response.body).to.eql(interactionRecord);
      });
    });
  });
}
