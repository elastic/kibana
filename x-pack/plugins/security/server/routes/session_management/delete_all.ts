/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import typeDetect from 'type-detect';
import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the deleting of all sessions.
 */
export function defineDeleteAllSessionsRoutes({ router, getSession }: RouteDefinitionParams) {
  router.delete(
    {
      path: '/internal/security/session/_all',
      validate: {
        query: schema.maybe(
          schema.object(
            {
              // `providerType` is actually required when any other options are specified, but such schema isn't
              // currently supported by the Core for `query` string parameters. To workaround that we mark this property
              // as optional and do custom validation instead: https://github.com/elastic/kibana/issues/92201
              providerType: schema.maybe(schema.string()),
              providerName: schema.maybe(schema.string()),
              username: schema.maybe(schema.string()),
            },
            {
              validate(value) {
                if (typeof value?.providerType !== 'string' && Object.keys(value).length > 0) {
                  return `[request query.providerType]: expected value of type [string] but got [${typeDetect(
                    value?.providerType
                  )}]`;
                }
              },
            }
          )
        ),
      },
      options: { tags: ['access:sessionManagement'] },
    },
    async (_context, request, response) => {
      return response.ok({
        body: {
          total: await getSession().clearAll(
            request,
            request.query?.providerType
              ? {
                  provider: { type: request.query.providerType, name: request.query.providerName },
                  username: request.query.username,
                }
              : undefined
          ),
        },
      });
    }
  );
}
