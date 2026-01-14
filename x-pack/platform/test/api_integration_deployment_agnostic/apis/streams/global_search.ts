/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isEqual } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';
import type { SupertestWithRoleScope } from '../../services/role_scoped_supertest';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  let supertest: SupertestWithRoleScope;

  describe('Global search', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should have Streams searchable types', async () => {
      const response = await supertest.get('/internal/global_search/searchable_types').expect(200);

      expect(response.body.types).to.contain('stream');
      expect(response.body.types).to.contain('classic stream');
      expect(response.body.types).to.contain('wired stream');
    });

    it('should find Streams', async () => {
      const response = await supertest
        .post('/internal/global_search/find')
        .send({
          params: { term: 'logs' },
        })
        .expect(200);

      expect(
        response.body.results.some((result: any) =>
          isEqual(result, {
            id: 'logs',
            score: 85,
            title: 'logs',
            type: 'Wired stream',
            url: '/app/streams/logs',
          })
        )
      ).to.be(true);
    });
  });
}
