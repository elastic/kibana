/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, identity } from 'lodash';
import Joi from 'joi';
import { ALL_RESOURCE } from '../../../../../common/constants';
import { wrapError } from '../../../../lib/errors';

export const schema = Joi.object().keys({
  metadata: Joi.object().optional(),
  transient_metadata: Joi.object(),
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
  kibana: Joi.array().items({
    privileges: Joi.array().items(Joi.string()),
  }),
});

const transformKibanaPrivilegeToEs = (application, kibanaPrivilege) => {
  return {
    privileges: kibanaPrivilege.privileges,
    application,
    resources: [ALL_RESOURCE],
  };
};

const transformRolesToEs = (
  application,
  payload,
  existingApplications = []
) => {
  const { elasticsearch = {}, kibana = [] } = payload;
  const otherApplications = existingApplications.filter(
    roleApplication => roleApplication.application !== application
  );

  return pick({
    metadata: payload.metadata,
    transient_metadata: payload.transient_metadata,
    cluster: elasticsearch.cluster || [],
    indices: elasticsearch.indices || [],
    run_as: elasticsearch.run_as || [],
    applications: [
      ...kibana.map(kibanaPrivilege =>
        transformKibanaPrivilegeToEs(application, kibanaPrivilege)
      ),
      ...otherApplications,
    ],
  }, identity);
};

export function initPostRolesApi(
  server,
  callWithRequest,
  routePreCheckLicenseFn,
  application
) {
  server.route({
    method: 'POST',
    path: '/api/security/roles/{name}',
    async handler(request, reply) {
      const name = request.params.name;
      try {
        const role = await callWithRequest(request, 'shield.getRole', {
          name,
          ignore: [404],
        });

        const body = transformRolesToEs(
          application,
          request.payload,
          role.applications
        );

        await callWithRequest(request, 'shield.putRole', { name, body });
        reply();
      } catch (err) {
        reply(wrapError(err));
      }
    },
    config: {
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
