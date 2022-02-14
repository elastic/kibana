/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from 'src/core/server';

import type { KibanaFeature } from '../../../features/common';
import type { SecurityLicense } from '../../common/licensing';
import type {
  PrivilegeDeprecationsRolesByFeatureIdRequest,
  PrivilegeDeprecationsRolesByFeatureIdResponse,
} from '../../common/model';
import { transformElasticsearchRoleToRole } from '../authorization';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export const getPrivilegeDeprecationsService = ({
  authz,
  getFeatures,
  license,
  logger,
}: {
  authz: Pick<AuthorizationServiceSetupInternal, 'applicationName'>;
  getFeatures(): Promise<KibanaFeature[]>;
  license: SecurityLicense;
  logger: Logger;
}) => {
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
      const [features, elasticsearchRoles] = await Promise.all([
        getFeatures(),
        context.esClient.asCurrentUser.security.getRole(),
      ]);
      kibanaRoles = Object.entries(elasticsearchRoles).map(([roleName, elasticsearchRole]) =>
        transformElasticsearchRoleToRole(
          features,
          // @ts-expect-error `SecurityIndicesPrivileges.names` expected to be `string[]`
          elasticsearchRole,
          roleName,
          authz.applicationName
        )
      );
    } catch (e) {
      const statusCode = getErrorStatusCode(e);
      const isUnauthorized = statusCode === 403;
      const message = isUnauthorized
        ? i18n.translate('xpack.security.privilegeDeprecationsService.error.unauthorized.message', {
            defaultMessage: `You must have the 'manage_security' cluster privilege to fix role deprecations.`,
          })
        : i18n.translate(
            'xpack.security.privilegeDeprecationsService.error.retrievingRoles.message',
            {
              defaultMessage: `Error retrieving roles for privilege deprecations: {message}`,
              values: {
                message: getDetailedErrorMessage(e),
              },
            }
          );

      if (isUnauthorized) {
        logger.warn(
          `Failed to retrieve roles when checking for deprecations: the manage_security cluster privilege is required`
        );
      } else {
        logger.error(
          `Failed to retrieve roles when checking for deprecations, unexpected error: ${getDetailedErrorMessage(
            e
          )}`
        );
      }

      return {
        errors: [
          {
            title: i18n.translate('xpack.security.privilegeDeprecationsService.error.title', {
              defaultMessage: `Error in privilege deprecations services`,
            }),
            level: 'fetch_error',
            message,
            correctiveActions: {
              manualSteps: [
                i18n.translate('xpack.security.privilegeDeprecationsService.manualSteps.message', {
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
