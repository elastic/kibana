/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecationsDetails, DeprecationsServiceSetup } from 'src/core/server';

import type { SecurityLicense } from '../../common/licensing';
import { transformElasticsearchRoleToRole } from '../authorization';
import type { AuthorizationServiceSetup, ElasticsearchRole } from '../authorization';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  authz: Pick<AuthorizationServiceSetup, 'applicationName'>;
  license: SecurityLicense;
}

export const registerPrivilegeDeprecations = ({ deprecationsService, authz, license }: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      // Nothing to do if security is disabled
      if (!license.isEnabled()) {
        return [];
      }

      let kibanaRoles;
      try {
        const { body: elasticsearchRoles } = await context.esClient.asCurrentUser.security.getRole<
          Record<string, ElasticsearchRole>
        >();

        kibanaRoles = Object.entries(elasticsearchRoles).map(([roleName, elasticsearchRole]) =>
          transformElasticsearchRoleToRole(
            // @ts-expect-error @elastic/elasticsearch `XPackRole` type doesn't define `applications` and `transient_metadata`.
            elasticsearchRole,
            roleName,
            authz.applicationName
          )
        );
      } catch (e) {
        const statusCode = getErrorStatusCode(e);
        const isUnauthorized = statusCode === 403;
        const message = isUnauthorized
          ? `You must have the 'manage_security' cluster privilege to fix role deprecations.`
          : `Error retrieving roles for privilege deprecations: ${getDetailedErrorMessage(e)}`;

        return [
          {
            level: 'fetch_error',
            message,
            correctiveActions: {
              manualSteps: [
                'A user with the "manage_security" cluster privilege is required to perform this check.',
              ],
            },
          },
        ];
      }

      const rolesWithSiem = kibanaRoles.filter((role) =>
        role.kibana.find((privilege) => Object.hasOwnProperty.call(privilege.feature, 'siem'))
      );

      return rolesWithSiem.map<DeprecationsDetails>((role) => {
        const { metadata, elasticsearch, kibana } = role;

        const updatedKibana = kibana.map((privilege) => {
          const { siem, ...otherFeatures } = privilege.feature;
          const privilegeContainsSiem = Array.isArray(siem) && siem.length > 0;

          if (privilegeContainsSiem) {
            return {
              ...privilege,
              feature: {
                ...otherFeatures,
                // FIXME: do something to transform this into the "new" set of privileges
              },
            };
          }
          return privilege;
        });

        const updatedRole = {
          metadata,
          elasticsearch,
          kibana: updatedKibana,
        };

        return {
          message: 'The "siem" feature privilege has been replaced with "foo" and "bar".',
          level: 'warning',
          correctiveActions: {
            api: {
              method: 'PUT',
              path: `/api/security/role/${encodeURIComponent(role.name)}`,
              body: updatedRole,
            },
          },
        };
      });
    },
  });
};
