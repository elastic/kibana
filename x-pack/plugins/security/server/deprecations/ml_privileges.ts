/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  DeprecationsDetails,
  DeprecationsServiceSetup,
  ElasticsearchClient,
  Logger,
  PackageInfo,
} from 'src/core/server';

import type { SecurityLicense } from '../../common';
import type { Role } from '../../common/model';
import { isRoleReserved } from '../../common/model';
import { transformElasticsearchRoleToRole } from '../authorization';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export const KIBANA_USER_ROLE_NAME = 'kibana_user';
export const KIBANA_ADMIN_ROLE_NAME = 'kibana_admin';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  license: SecurityLicense;
  logger: Logger;
  packageInfo: PackageInfo;
  applicationName: string;
}

function getDeprecationTitle() {
  return i18n.translate('xpack.security.deprecations.mlPrivileges.deprecationTitle', {
    defaultMessage: 'Access to Machine Learning features will be granted in 8.0',
  });
}

function getDeprecationMessage() {
  return i18n.translate('xpack.security.deprecations.mlPrivileges.deprecationMessage', {
    defaultMessage:
      'Roles that grant "all" or "read" privileges to all features will include Machine Learning.',
  });
}

export const registerMLPrivilegesDeprecation = ({
  deprecationsService,
  logger,
  license,
  packageInfo,
  applicationName,
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      // Nothing to do if security or ml is disabled
      if (!license.isEnabled() || !license.getFeatures().allowML) {
        return [];
      }

      return [
        ...(await getRolesDeprecations(
          context.esClient.asCurrentUser,
          logger,
          packageInfo,
          applicationName
        )),
      ];
    },
  });
};

async function getRolesDeprecations(
  client: ElasticsearchClient,
  logger: Logger,
  packageInfo: PackageInfo,
  applicationName: string
): Promise<DeprecationsDetails[]> {
  let roles: Role[];
  try {
    const elasticsearchRoles = (await client.security.getRole()).body;

    roles = Object.entries(elasticsearchRoles).map(([roleName, elasticsearchRole]) =>
      transformElasticsearchRoleToRole(
        // @ts-expect-error `SecurityIndicesPrivileges.names` expected to be `string[]`
        elasticsearchRole,
        roleName,
        applicationName
      )
    );
  } catch (err) {
    if (getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve roles when checking for deprecations: the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve roles when checking for deprecations, unexpected error: ${getDetailedErrorMessage(
          err
        )}.`
      );
    }
    return deprecationError(packageInfo, err);
  }

  const rolesWithBasePrivileges = roles
    .filter((role) => {
      const hasBasePrivileges = role.kibana.some(
        (kp) => kp.base.includes('all') || kp.base.includes('read')
      );
      return !isRoleReserved(role) && hasBasePrivileges;
    })
    .map((role) => role.name);

  if (rolesWithBasePrivileges.length === 0) {
    return [];
  }

  return [
    {
      title: getDeprecationTitle(),
      message: getDeprecationMessage(),
      level: 'warning',
      deprecationType: 'feature',
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.security.deprecations.mlPrivileges.deprecationCorrectiveAction', {
            defaultMessage:
              'The following roles will grant access to Machine Learning features starting in 8.0. Update this role to grant access to specific features if you do not want to grant access to Machine Learning: {roles}',
            values: {
              roles: rolesWithBasePrivileges.join(', '),
            },
          }),
        ],
      },
    },
  ];
}

function deprecationError(packageInfo: PackageInfo, error: Error): DeprecationsDetails[] {
  const title = getDeprecationTitle();

  if (getErrorStatusCode(error) === 403) {
    return [
      {
        title,
        level: 'fetch_error',
        deprecationType: 'feature',
        message: i18n.translate('xpack.security.deprecations.mlPrivileges.forbiddenErrorMessage', {
          defaultMessage: 'You do not have enough permissions to fix this deprecation.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/xpack-security.html#_required_permissions_7`,
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.security.deprecations.mlPrivileges.forbiddenErrorCorrectiveAction',
              {
                defaultMessage:
                  'Make sure you have a "manage_security" cluster privilege assigned.',
              }
            ),
          ],
        },
      },
    ];
  }

  return [
    {
      title,
      level: 'fetch_error',
      deprecationType: 'feature',
      message: i18n.translate('xpack.security.deprecations.mlPrivileges.unknownErrorMessage', {
        defaultMessage: 'Failed to perform deprecation check. Check Kibana logs for more details.',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.security.deprecations.mlPrivileges.unknownErrorCorrectiveAction', {
            defaultMessage: 'Check Kibana logs for more details.',
          }),
        ],
      },
    },
  ];
}
