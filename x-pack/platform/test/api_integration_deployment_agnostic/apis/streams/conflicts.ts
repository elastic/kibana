/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, forkStream } from './helpers/requests';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('conflict handling', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should not allow multiple requests manipulating streams state at once', async () => {
      const stream1 = {
        stream: {
          name: 'logs.nginx',
        },
        if: {
          field: 'resource.attributes.host.name',
          operator: 'eq' as const,
          value: 'routeme',
        },
      };
      const stream2 = {
        stream: {
          name: 'logs.apache',
        },
        if: {
          field: 'resource.attributes.host.name',
          operator: 'eq' as const,
          value: 'routeme2',
        },
      };
      const responses = await Promise.allSettled([
        forkStream(apiClient, 'logs', stream1),
        forkStream(apiClient, 'logs', stream2),
      ]);
      // Assert than one of the requests failed with a conflict error and the other succeeded
      // It needs to check either way (success or failure) because the order of execution is not guaranteed
      expect(responses).to.have.length(2);
      const successResponse = responses.find(
        (response) => response.status === 'fulfilled' && response.value.acknowledged
      );
      const conflictResponse = responses.find(
        (response) =>
          response.status === 'rejected' &&
          String(response.reason).toLowerCase().includes('conflict')
      );
      expect(successResponse).to.not.be(undefined);
      expect(conflictResponse).to.not.be(undefined);
    });
  });
}
