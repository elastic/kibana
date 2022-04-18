/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapError } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineRoleMappingPostRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/role_mapping/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          roles: schema.arrayOf(schema.string(), { defaultValue: [] }),
          role_templates: schema.arrayOf(
            schema.object({
              // Not validating `template` because the ES API currently accepts invalid payloads here.
              // We allow this as well so that existing mappings can be updated via our Role Management UI
              template: schema.any(),
              format: schema.maybe(
                schema.oneOf([schema.literal('string'), schema.literal('json')])
              ),
            }),
            { defaultValue: [] }
          ),
          enabled: schema.boolean(),
          // Also lax on validation here because the real rules get quite complex,
          // and keeping this in sync (and testable!) with ES could prove problematic.
          // We do not interpret any of these rules within this route handler;
          // they are simply passed to ES for processing.
          rules: schema.object({}, { unknowns: 'allow' }),
          metadata: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const saveResponse =
          await context.core.elasticsearch.client.asCurrentUser.security.putRoleMapping({
            name: request.params.name,
            body: request.body,
          });
        return response.ok({ body: saveResponse });
      } catch (error) {
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );
}
