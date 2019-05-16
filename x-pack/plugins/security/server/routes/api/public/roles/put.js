/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, pick, identity, intersection } from 'lodash';
import Joi from 'joi';
import { GLOBAL_RESOURCE } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';
import { PrivilegeSerializer, ResourceSerializer } from '../../../../lib/authorization';

export function initPutRolesApi(
  server,
  callWithRequest,
  routePreCheckLicenseFn,
  authorization,
  application
) {

  const transformKibanaPrivilegesToEs = (kibanaPrivileges = []) => {
    return kibanaPrivileges.map(({ base, feature, spaces }) => {
      if (spaces.length === 1 && spaces[0] === GLOBAL_RESOURCE) {
        return {
          privileges: [
            ...base ? base.map(
              privilege => PrivilegeSerializer.serializeGlobalBasePrivilege(privilege)
            ) : [],
            ...feature ? flatten(
              Object.entries(feature).map(
                ([featureName, featurePrivileges])=> featurePrivileges.map(
                  privilege => PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                )
              )
            ) : []
          ],
          application,
          resources: [GLOBAL_RESOURCE]
        };
      }

      return {
        privileges: [
          ...base ? base.map(
            privilege => PrivilegeSerializer.serializeSpaceBasePrivilege(privilege)
          ) : [],
          ...feature ? flatten(
            Object.entries(feature).map(
              ([featureName, featurePrivileges])=> featurePrivileges.map(
                privilege => PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
              )
            )
          ) : []
        ],
        application,
        resources: spaces.map(resource => ResourceSerializer.serializeSpaceResource(resource)),
      };
    });
  };

  const transformRolesToEs = (
    payload,
    existingApplications = []
  ) => {
    const { elasticsearch = {}, kibana = [] } = payload;
    const otherApplications = existingApplications.filter(
      roleApplication => roleApplication.application !== application
    );

    return pick({
      metadata: payload.metadata,
      cluster: elasticsearch.cluster || [],
      indices: elasticsearch.indices || [],
      run_as: elasticsearch.run_as || [],
      applications: [
        ...transformKibanaPrivilegesToEs(kibana),
        ...otherApplications,
      ],
    }, identity);
  };

  const getKibanaSchema = () => {
    const privileges = authorization.privileges.get();
    const allSpacesSchema = Joi.array().length(1).items(Joi.string().valid([GLOBAL_RESOURCE]));
    return Joi.array().items(
      Joi.object({
        base: Joi.alternatives().when('spaces', {
          is: allSpacesSchema,
          then: Joi.array().items(Joi.string().valid(Object.keys(privileges.global))).empty(Joi.array().length(0)),
          otherwise: Joi.array().items(Joi.string().valid(Object.keys(privileges.space))).empty(Joi.array().length(0)),
        }),
        feature: Joi.object()
          .pattern(/^[a-zA-Z0-9_-]+$/, Joi.array().items(Joi.string().regex(/^[a-zA-Z0-9_-]+$/)))
          .empty(Joi.object().length(0)),
        spaces: Joi.alternatives(
          allSpacesSchema,
          Joi.array().items(Joi.string().regex(/^[a-z0-9_-]+$/)),
        ).default([GLOBAL_RESOURCE]),
      })
        // the following can be replaced with .oxor once we upgrade Joi
        .without('base', ['feature'])
    ).unique((a, b) => {
      return intersection(a.spaces, b.spaces).length !== 0;
    });
  };

  const schema = Joi.object().keys({
    metadata: Joi.object().optional(),
    elasticsearch: Joi.object().keys({
      cluster: Joi.array().items(Joi.string()),
      indices: Joi.array().items({
        names: Joi.array().items(Joi.string()),
        field_security: Joi.object().keys({
          grant: Joi.array().items(Joi.string()),
          except: Joi.array().items(Joi.string()),
        }),
        privileges: Joi.array().items(Joi.string()),
        query: Joi.string().allow(''),
        allow_restricted_indices: Joi.boolean(),
      }),
      run_as: Joi.array().items(Joi.string()),
    }),
    kibana: Joi.lazy(() => getKibanaSchema())
  });

  server.route({
    method: 'PUT',
    path: '/api/security/role/{name}',
    async handler(request, h) {
      const { name } = request.params;

      try {
        const existingRoleResponse = await callWithRequest(request, 'shield.getRole', {
          name,
          ignore: [404],
        });

        const body = transformRolesToEs(
          request.payload,
          existingRoleResponse[name] ? existingRoleResponse[name].applications : []
        );

        await callWithRequest(request, 'shield.putRole', { name, body });
        return h.response().code(204);
      } catch (err) {
        throw wrapError(err);
      }
    },
    options: {
      validate: {
        params: Joi.object()
          .keys({
            name: Joi.string()
              .required()
              .min(1)
              .max(1024),
          })
          .required(),
        payload: schema,
      },
      pre: [routePreCheckLicenseFn],
    },
  });
}
