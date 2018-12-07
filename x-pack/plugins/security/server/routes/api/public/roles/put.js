/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, pick, identity } from 'lodash';
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

  const transformKibanaPrivilegesToEs = (kibanaPrivileges) => {
    const kibanaApplicationPrivileges = [];
    const { minimum = [], feature = {} } = kibanaPrivileges.global || {};

    if (minimum.length > 0 || Object.keys(feature).length > 0) {
      kibanaApplicationPrivileges.push({
        privileges: [
          ...kibanaPrivileges.global.minimum ? kibanaPrivileges.global.minimum.map(
            privilege => PrivilegeSerializer.serializeGlobalMinimumPrivilege(privilege)
          ) : [],
          ...kibanaPrivileges.global.feature ? flatten(
            Object.entries(kibanaPrivileges.global.feature).map(
              ([featureName, privileges])=> privileges.map(
                privilege => PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
              )
            )
          ) : [],
        ],
        application,
        resources: [GLOBAL_RESOURCE],
      });
    }

    if (kibanaPrivileges.space) {
      for(const [spaceId, spacePrivileges] of Object.entries(kibanaPrivileges.space)) {
        kibanaApplicationPrivileges.push({
          privileges: [
            ...spacePrivileges.minimum ? spacePrivileges.minimum.map(
              privilege => PrivilegeSerializer.serializeSpaceMinimumPrivilege(privilege)
            ) : [],
            ...spacePrivileges.feature ? flatten(
              Object.entries(spacePrivileges.feature).map(
                ([featureName, privileges])=> privileges.map(
                  privilege => PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                )
              )
            ) : []
          ],
          application,
          resources: [ResourceSerializer.serializeSpaceResource(spaceId)],
        });
      }
    }

    return kibanaApplicationPrivileges;
  };

  const transformRolesToEs = (
    payload,
    existingApplications = []
  ) => {
    const { elasticsearch = {}, kibana = {} } = payload;
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

  const getGlobalSchema = () => {
    const privileges = authorization.privileges.get();
    const featureObject = Object.entries(privileges.features).reduce((acc, [feature, featurePrivileges]) => ({
      ...acc,
      [feature]: Joi.array().items(Joi.string().valid(Object.keys(featurePrivileges)))
    }), {});
    const featureSchema = Joi.object(featureObject);
    return Joi.object({
      minimum: Joi.array().items(Joi.string().valid(Object.keys(privileges.global))),
      feature: featureSchema,
    });
  };

  const getSpaceSchema = () => {
    const privileges = authorization.privileges.get();
    return Joi.object().pattern(/^[a-z0-9_-]+$/, Joi.object({
      minimum: Joi.array().items(Joi.string().valid(Object.keys(privileges.space))),
      feature: Joi.object(Object.entries(privileges.features).reduce((acc, [feature, featurePrivileges]) => ({
        ...acc,
        [feature]: Joi.array().items(Joi.string().valid(Object.keys(featurePrivileges)))
      }), {}))
    }));
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
      }),
      run_as: Joi.array().items(Joi.string()),
    }),
    kibana: Joi.object().keys({
      global: Joi.lazy(() => getGlobalSchema()),
      space: Joi.lazy(() => getSpaceSchema()),
    })
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

        console.log(body);

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
