/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityGetRoleMappingResponse,
  SecurityGetUserResponse,
} from '@elastic/elasticsearch/api/types';

import { i18n } from '@kbn/i18n';
import type {
  DeprecationsDetails,
  DeprecationsServiceSetup,
  ElasticsearchClient,
  Logger,
  PackageInfo,
} from 'src/core/server';

import type { SecurityLicense } from '../../common';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export const KIBANA_USER_ROLE_NAME = 'kibana_user';
export const KIBANA_ADMIN_ROLE_NAME = 'kibana_admin';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  license: SecurityLicense;
  logger: Logger;
  packageInfo: PackageInfo;
}

export const registerKibanaUserRoleDeprecation = ({
  deprecationsService,
  logger,
  license,
  packageInfo,
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      // Nothing to do if security is disabled
      if (!license.isEnabled()) {
        return [];
      }

      return [
        ...(await getUsersDeprecations(context.esClient.asCurrentUser, logger, packageInfo)),
        ...(await getRoleMappingsDeprecations(context.esClient.asCurrentUser, logger, packageInfo)),
      ];
    },
  });
};

async function getUsersDeprecations(
  client: ElasticsearchClient,
  logger: Logger,
  packageInfo: PackageInfo
): Promise<DeprecationsDetails[]> {
  let users: SecurityGetUserResponse;
  try {
    users = (await client.security.getUser()).body;
  } catch (err) {
    logger.error(`Failed to retrieve users: ${getDetailedErrorMessage(err)}`);
    return deprecationError(packageInfo, err);
  }

  const usersWithKibanaUserRole = Object.values(users)
    .filter((user) => user.roles.includes(KIBANA_USER_ROLE_NAME))
    .map((user) => user.username);
  if (usersWithKibanaUserRole.length === 0) {
    return [];
  }

  return [
    {
      title: i18n.translate('xpack.security.deprecations.kibanaUser.deprecationTitle', {
        defaultMessage: 'The "{userRoleName}" role is removed and "{adminRoleName}" role is added',
        values: { userRoleName: KIBANA_USER_ROLE_NAME, adminRoleName: KIBANA_ADMIN_ROLE_NAME },
      }),
      message: i18n.translate('xpack.security.deprecations.kibanaUser.usersDeprecationMessage', {
        defaultMessage:
          'The following users have a deprecated and removed "{userRoleName}" role: {users}. Update these users to use "{adminRoleName}" role instead.',
        values: {
          userRoleName: KIBANA_USER_ROLE_NAME,
          adminRoleName: KIBANA_ADMIN_ROLE_NAME,
          users: usersWithKibanaUserRole.join(', '),
        },
      }),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/xpack-security-authorization.html`,
      correctiveActions: {
        api: {
          method: 'POST',
          path: '/internal/security/deprecations/kibana_user_role/_fix_users',
        },
        manualSteps: [
          i18n.translate(
            'xpack.security.deprecations.kibanaUser.usersDeprecationCorrectiveAction',
            {
              defaultMessage:
                'Change all users using the "{userRoleName}" role to use the "{adminRoleName}" role using Kibana user management.',
              values: {
                userRoleName: KIBANA_USER_ROLE_NAME,
                adminRoleName: KIBANA_ADMIN_ROLE_NAME,
              },
            }
          ),
        ],
      },
    },
  ];
}

async function getRoleMappingsDeprecations(
  client: ElasticsearchClient,
  logger: Logger,
  packageInfo: PackageInfo
): Promise<DeprecationsDetails[]> {
  let roleMappings: SecurityGetRoleMappingResponse;
  try {
    roleMappings = (await client.security.getRoleMapping()).body;
  } catch (err) {
    logger.error(`Failed to retrieve role mappings: ${getDetailedErrorMessage(err)}`);
    return deprecationError(packageInfo, err);
  }

  const roleMappingsWithKibanaUserRole = Object.entries(roleMappings)
    .filter(([, roleMapping]) => roleMapping.roles.includes(KIBANA_USER_ROLE_NAME))
    .map(([mappingName]) => mappingName);
  if (roleMappingsWithKibanaUserRole.length === 0) {
    return [];
  }

  return [
    {
      title: i18n.translate('xpack.security.deprecations.kibanaUser.deprecationTitle', {
        defaultMessage: 'The "{userRoleName}" role is removed and "{adminRoleName}" role is added',
        values: { userRoleName: KIBANA_USER_ROLE_NAME, adminRoleName: KIBANA_ADMIN_ROLE_NAME },
      }),
      message: i18n.translate(
        'xpack.security.deprecations.kibanaUser.roleMappingsDeprecationMessage',
        {
          defaultMessage:
            'The following role mappings map to a deprecated and removed "{userRoleName}" role: {roleMappings}. Update these role mappings to use "{adminRoleName}" role instead.',
          values: {
            userRoleName: KIBANA_USER_ROLE_NAME,
            adminRoleName: KIBANA_ADMIN_ROLE_NAME,
            roleMappings: roleMappingsWithKibanaUserRole.join(', '),
          },
        }
      ),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/xpack-security-authorization.html`,
      correctiveActions: {
        api: {
          method: 'POST',
          path: '/internal/security/deprecations/kibana_user_role/_fix_role_mappings',
        },
        manualSteps: [
          i18n.translate(
            'xpack.security.deprecations.kibanaUser.roleMappingsDeprecationCorrectiveAction',
            {
              defaultMessage:
                'Change all role mappings using the "{userRoleName}" role to use the "{adminRoleName}" role using Kibana role mappings management.',
              values: {
                userRoleName: KIBANA_USER_ROLE_NAME,
                adminRoleName: KIBANA_ADMIN_ROLE_NAME,
              },
            }
          ),
        ],
      },
    },
  ];
}

function deprecationError(packageInfo: PackageInfo, error: Error): DeprecationsDetails[] {
  const title = i18n.translate('xpack.security.deprecations.kibanaUser.deprecationTitle', {
    defaultMessage: 'The "{userRoleName}" role is removed and "{adminRoleName}" role is added',
    values: { userRoleName: KIBANA_USER_ROLE_NAME, adminRoleName: KIBANA_ADMIN_ROLE_NAME },
  });

  if (getErrorStatusCode(error) === 403) {
    return [
      {
        title,
        level: 'fetch_error',
        deprecationType: 'feature',
        message: i18n.translate('xpack.security.deprecations.kibanaUser.forbiddenErrorMessage', {
          defaultMessage: 'You do not have enough permissions to fix this deprecation.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/xpack-security.html#_required_permissions_7`,
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.security.deprecations.kibanaUser.forbiddenErrorCorrectiveAction',
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
      message: i18n.translate('xpack.security.deprecations.kibanaUser.unknownErrorMessage', {
        defaultMessage: 'Failed to perform deprecation check. Check Kibana logs for more details.',
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.security.deprecations.kibanaUser.unknownErrorCorrectiveAction', {
            defaultMessage: 'Check Kibana logs for more details.',
          }),
        ],
      },
    },
  ];
}
