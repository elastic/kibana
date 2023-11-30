/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { schema } from '@kbn/config-schema';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import { SimpleAPIClient } from '../../agentless_service/agentless_api_client';
import { CspRouter } from '../../types';

export const defineGetAgentless = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/cloud_security_posture/agentless',
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
      // For dev tools https://github.com/elastic/kibana/issues/160801
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({ url: schema.string() }),
          },
        },
      },
      async (context, request, response) => {
        const cspContext = await context.csp;
        try {
          const tlsConfig = new SslConfig(
            sslSchema.validate({
              enabled: true,
              // generate locally with https://serverfault.com/a/224127
              certificate: 'config/certs/node.crt',
              key: 'config/certs/node.key',
              clientAuthentication: 'required',
            })
          );

          const simpleApiClient = new SimpleAPIClient(request.query.url, 'user', 'pass', {
            cert: tlsConfig.certificate,
            key: tlsConfig.key,
          });
          // test with dev tools
          // GET kbn:/internal/cloud_security_posture/agentless?apiVersion=1&url=http://certauth.cryptomix.com
          const data = await simpleApiClient.get('/json/');

          return response.ok({
            body: data,
          });
        } catch (err) {
          cspContext.logger.error(
            `Failed to use agentless client ${err}, ${process.cwd()}. ${readFileSync(
              'config/certs/node.key'
            ).toString()}`
          );
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode,
          });
        }
      }
    );
