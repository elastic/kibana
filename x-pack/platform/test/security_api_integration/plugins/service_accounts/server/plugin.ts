/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { setTimeout } from 'timers/promises';

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';

interface SetupDependencies {
  security: SecurityPluginSetup;
}

export class ServiceAccountsTestPlugin implements Plugin<void, void, SetupDependencies> {
  setup(core: CoreSetup, { security }: SetupDependencies): void {
    core.security.serviceAccounts.registerWorkloadType({ type: 'job', name: 'Test job' });
    core.http.createRouter().post(
      {
        path: '/internal/service_accounts_test/{workloadId}',
        options: { access: 'internal' },
        security: {
          authz: {
            enabled: false,
            reason:
              'The test consumer checks the caller’s manage_security cluster privilege before every operation.',
          },
        },
        validate: {
          params: schema.object({ workloadId: schema.string({ minLength: 1, maxLength: 128 }) }),
          body: schema.object({
            operation: schema.oneOf([
              schema.literal('bind'),
              schema.literal('unbind'),
              schema.literal('execute'),
            ]),
            serviceAccountId: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
            waitMs: schema.number({ min: 0, max: 20000, defaultValue: 0 }),
            action: schema.oneOf([schema.literal('authenticate'), schema.literal('read_role')], {
              defaultValue: 'authenticate',
            }),
            revoke: schema.oneOf(
              [
                schema.literal('none'),
                schema.literal('unbind'),
                schema.literal('disable'),
                schema.literal('delete_token'),
              ],
              { defaultValue: 'none' }
            ),
          }),
        },
      },
      async (_context, request, response) => {
        const { hasAllRequested } = await security.authz
          .checkPrivilegesWithRequest(request)
          .globally({
            elasticsearch: { cluster: ['manage_security'], index: {} },
          });
        if (!hasAllRequested) return response.forbidden();
        const [start] = await core.getStartServices();
        const api = start.security.serviceAccounts;
        const workload = { workloadType: 'job', workloadId: request.params.workloadId };
        const { operation, serviceAccountId, waitMs, action, revoke } = request.body;
        try {
          if (operation === 'bind') {
            if (!serviceAccountId) return response.badRequest();
            return response.ok({
              body: await api.bindWorkload(request, { ...workload, serviceAccountId }),
            });
          }
          if (operation === 'unbind') {
            return response.ok({ body: { deleted: await api.unbindWorkload(request, workload) } });
          }
          const result = await api.withScopedRequestForWorkload(
            { ...workload, spaceId: request.spaceId ?? 'default' },
            async (fakeRequest) => {
              const client = start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
              const initialAuthorization = fakeRequest.headers.authorization;
              const principal = start.security.authc.getPrincipal(fakeRequest);
              const initial = await client.security.authenticate();
              await client.cluster.health();
              if (action === 'read_role') await client.security.getRole({ name: 'superuser' });
              if (revoke === 'unbind') await api.unbindWorkload(request, workload);
              if (revoke === 'disable' || revoke === 'delete_token') {
                const [namespace, name] = initial.username.split('/');
                const accountPath = `/_security/service/${encodeURIComponent(
                  namespace
                )}/${encodeURIComponent(name)}`;
                const admin = start.elasticsearch.client.asScoped(request).asCurrentUser;
                if (revoke === 'disable') {
                  await admin.transport.request({
                    method: 'PUT',
                    path: accountPath,
                    body: { roles: initial.roles, enabled: false },
                    querystring: { refresh: 'wait_for' },
                  });
                } else {
                  await admin.transport.request({
                    method: 'DELETE',
                    path: `${accountPath}/credential/token/kibana-managed`,
                    querystring: { refresh: 'wait_for' },
                  });
                }
              }
              // Revoking the source authority does not invalidate the already-issued token.
              const afterChange = await client.security.authenticate();
              await setTimeout(waitMs);
              try {
                const renewed = await client.security.authenticate();
                return {
                  username: initial.username,
                  afterChangeUsername: afterChange.username,
                  renewedUsername: renewed.username,
                  tokenChanged: initialAuthorization !== fakeRequest.headers.authorization,
                  spaceId: fakeRequest.spaceId,
                  principal,
                  renewedPrincipal: start.security.authc.getPrincipal(fakeRequest),
                };
              } catch (error) {
                if (!(error instanceof errors.ResponseError)) throw error;
                return {
                  username: initial.username,
                  afterChangeUsername: afterChange.username,
                  renewalStatus: error.statusCode,
                };
              }
            }
          );
          return response.ok({ body: result });
        } catch (error) {
          const statusCode = Boom.isBoom(error)
            ? error.output.statusCode
            : error instanceof errors.ResponseError
            ? error.statusCode ?? 500
            : 500;
          return response.customError({
            statusCode,
            body: { message: 'Service account test operation failed.' },
          });
        }
      }
    );
  }

  start(): void {}
}
