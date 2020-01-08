/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RoleMapping } from '../../../../../legacy/plugins/security/common/model';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { wrapError } from '../../errors';
import { RouteDefinitionParams } from '..';

interface RoleMappingsResponse {
  [roleMappingName: string]: Omit<RoleMapping, 'name'>;
}

export function defineRoleMappingGetRoutes(params: RouteDefinitionParams) {
  const { clusterClient, logger, router } = params;

  router.get(
    {
      path: '/internal/security/role_mapping/{name?}',
      validate: {
        params: schema.object({
          name: schema.maybe(schema.string()),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const expectSingleEntity = typeof request.params.name === 'string';

      try {
        const roleMappingsResponse: RoleMappingsResponse = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRoleMappings', {
            name: request.params.name,
          });

        const mappings = Object.entries(roleMappingsResponse).map(([name, mapping]) => {
          return {
            name,
            ...mapping,
            role_templates: (mapping.role_templates || []).map(entry => {
              return {
                ...entry,
                template: tryParseRoleTemplate(entry.template as string),
              };
            }),
          } as RoleMapping;
        });

        if (expectSingleEntity) {
          return response.ok({ body: mappings[0] });
        }
        return response.ok({ body: mappings });
      } catch (error) {
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );

  /**
   * While role templates are normally persisted as objects via the create API, they are stored internally as strings.
   * As a result, the ES APIs to retrieve role mappings represent the templates as strings, so we have to attempt
   * to parse them back out. ES allows for invalid JSON to be stored, so we have to account for that as well.
   *
   * @param roleTemplate the string-based template to parse
   */
  function tryParseRoleTemplate(roleTemplate: string) {
    try {
      return JSON.parse(roleTemplate);
    } catch (e) {
      logger.debug(`Role template is not valid JSON: ${e}`);
      return roleTemplate;
    }
  }
}
