/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { expectToRejectWithError } from '../space_awareness/helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('create managed OTLP api key', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await setupTestUsers(getService('security'));
    });

    describe('POST /internal/fleet/create_managed_otlp_api_key', () => {
      it('returns an encoded APM-scoped api key for a user with the correct permissions', async () => {
        const apiClient = new SpaceTestApiClient(supertest);
        const res = await apiClient.postManagedOtlpApiKey('managed-otlp');

        expect(res.item.name).to.match(
          /^managed-otlp-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
        expect(res.item.encoded).to.be.a('string');
        expect(res.item.id).to.be.a('string');
        expect(res.item.api_key).to.be.a('string');
      });

      // Regression test for https://github.com/elastic/kibana/issues/275751:
      // A user with Kibana Fleet: Agents All but NO ES cluster api-key privilege must be able
      // to create the managed OTLP key. The handler now mints the key as asInternalUser so the
      // caller's ES privileges are irrelevant; route authz (fleet-agents-all) still applies.
      it('returns an encoded APM-scoped api key for a user with Fleet: Agents All but no ES api-key privilege', async () => {
        const apiClient = new SpaceTestApiClient(supertestWithoutAuth, {
          username: testUsers.fleet_agents_all_only.username,
          password: testUsers.fleet_agents_all_only.password,
        });
        const res = await apiClient.postManagedOtlpApiKey('managed-otlp');

        expect(res.item.encoded).to.be.a('string');
        expect(res.item.id).to.be.a('string');
        expect(res.item.api_key).to.be.a('string');
      });

      it('returns 403 for a user without Fleet privileges', async () => {
        const apiClient = new SpaceTestApiClient(supertestWithoutAuth, {
          username: testUsers.fleet_no_access.username,
          password: testUsers.fleet_no_access.password,
        });
        await expectToRejectWithError(() => apiClient.postManagedOtlpApiKey('managed-otlp'), /403/);
      });
    });
  });
}
