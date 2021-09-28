/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { SecurityLicense } from '../../common/licensing';
import type {
  PrivilegeDeprecationsRolesByFeatureIdRequest,
  PrivilegeDeprecationsRolesByFeatureIdResponse,
} from '../../common/model';
import { transformElasticsearchRoleToRole } from '../authorization';
import type { AuthorizationServiceSetupInternal, ElasticsearchRole } from '../authorization';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export const getPrivilegeDeprecationsServices = (
  authz: AuthorizationServiceSetupInternal,
  license: SecurityLicense
) => {
  const getKibanaRolesByFeatureId = async ({
    context,
    featureId,
  }: PrivilegeDeprecationsRolesByFeatureIdRequest): Promise<PrivilegeDeprecationsRolesByFeatureIdResponse> => {
    // Nothing to do if security is disabled
    if (!license.isEnabled()) {
      return {
        roles: [],
      };
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
        ? i18n.translate(
            'xpack.security.privilegeDeprecationsServices.error.unauthorized.message',
            {
              defaultMessage: `You must have the 'manage_security' cluster privilege to fix role deprecations.`,
            }
          )
        : i18n.translate(
            'xpack.security.privilegeDeprecationsServices.error.retrievingRoles.message',
            {
              defaultMessage: `Error retrieving roles for privilege deprecations: {message}`,
              values: {
                message: getDetailedErrorMessage(e),
              },
            }
          );

      return {
        errors: [
          {
            title: i18n.translate('xpack.security.privilegeDeprecationsServices.error.title', {
              defaultMessage: `Error in privilege deprecations services`,
            }),
            level: 'fetch_error',
            message,
            correctiveActions: {
              manualSteps: [
                i18n.translate('xpack.security.privilegeDeprecationsServices.manualSteps.message', {
                  defaultMessage:
                    'A user with the "manage_security" cluster privilege is required to perform this check.',
                }),
              ],
            },
          },
        ],
      };
    }
    return {
      roles: kibanaRoles.filter((role) =>
        role.kibana.find((privilege) => Object.hasOwnProperty.call(privilege.feature, featureId))
      ),
    };
  };
  return Object.freeze({
    getKibanaRolesByFeatureId,
  });
};
