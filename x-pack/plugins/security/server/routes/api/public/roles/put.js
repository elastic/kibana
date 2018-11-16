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
    if (kibanaPrivileges.global && kibanaPrivileges.global.length) {
      kibanaApplicationPrivileges.push({
        privileges: kibanaPrivileges.global.map(privilege => PrivilegeSerializer.serializePrivilegeAssignedGlobally(privilege)),
        application,
        resources: [GLOBAL_RESOURCE],
      });
    }

    if (kibanaPrivileges.space) {
      for(const [spaceId, privileges] of Object.entries(kibanaPrivileges.space)) {
        kibanaApplicationPrivileges.push({
          privileges: privileges.map(privilege => PrivilegeSerializer.serializePrivilegeAssignedAtSpace(privilege)),
          application,
          resources: [ResourceSerializer.serializeSpaceResource(spaceId)]
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

  // this should be short-lived once we refactor the way that these APIs work, hence the ugly string concatenation
  // if you see this code in master, please yell at Brandon
  const getFeaturePrivileges = (features) => {
    return flatten(Object.entries(features).map(
      ([featureName, featurePrivileges]) => {
        return Object.keys(featurePrivileges).map(
          (privilegeName) => {
            return `${featureName}_${privilegeName}`;
          });
      })
    );
  };

  const getGlobalItemsSchema = () => {
    const privileges = authorization.privileges.get();
    const validPrivileges = [...Object.keys(privileges.global), ...getFeaturePrivileges(privileges.features)];
    return Joi.string().valid(validPrivileges);
  };

  const getSpaceItemsSchema = () => {
    const privileges = authorization.privileges.get();
    const validPrivileges = [...Object.keys(privileges.space), ...getFeaturePrivileges(privileges.features)];
    return Joi.string().valid(validPrivileges);
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
      global: Joi.array().items(Joi.lazy(() => getGlobalItemsSchema())),
      space: Joi.object().pattern(/^[a-z0-9_-]+$/, Joi.array().items(Joi.lazy(() => getSpaceItemsSchema())))
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
