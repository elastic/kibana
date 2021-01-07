/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { IRouter } from 'src/core/server';

import { Pipeline } from '../../models/pipeline';
import { wrapRouteWithLicenseCheck } from '../../../../licensing/server';
import { SecurityPluginSetup } from '../../../../security/server';
import { checkLicense } from '../../lib/check_license';

export function registerPipelineSaveRoute(router: IRouter, security?: SecurityPluginSetup) {
  router.put(
    {
      path: '/api/logstash/pipeline/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          description: schema.maybe(schema.string()),
          pipeline: schema.string(),
          settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        }),
      },
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        try {
          let username: string | undefined;
          if (security) {
            const user = await security.authc.getCurrentUser(request);
            username = user?.username;
          }

          const client = context.logstash!.esClient;
          const pipeline = Pipeline.fromDownstreamJSON(request.body, request.params.id, username);

          await client.callAsCurrentUser('transport.request', {
            path: '/_logstash/pipeline/' + encodeURIComponent(pipeline.id),
            method: 'PUT',
            body: pipeline.upstreamJSON,
          });

          return response.noContent();
        } catch (err) {
          const statusCode = err.statusCode;
          // handles the permissions issue of Elasticsearch
          if (statusCode === 403) {
            return response.forbidden({
              body: i18n.translate('xpack.logstash.insufficientUserPermissionsDescription', {
                defaultMessage: 'Insufficient user permissions for managing Logstash pipelines',
              }),
            });
          }
          throw err;
        }
      })
    )
  );
}
