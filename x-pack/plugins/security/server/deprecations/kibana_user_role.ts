/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityGetRoleMappingResponse,
  SecurityGetUserResponse,
} from '@elastic/elasticsearch/lib/api/types';

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

function getDeprecationTitle() {
  return i18n.translate('xpack.security.deprecations.kibanaUser.deprecationTitle', {
    defaultMessage: 'The "{userRoleName}" role is deprecated',
    values: { userRoleName: KIBANA_USER_ROLE_NAME },
  });
}

function getDeprecationMessage() {
  return i18n.translate('xpack.security.deprecations.kibanaUser.deprecationMessage', {
    defaultMessage:
      'Use the "{adminRoleName}" role to grant access to all Kibana features in all spaces.',
    values: { adminRoleName: KIBANA_ADMIN_ROLE_NAME },
  });
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
    users = await client.security.getUser();
  } catch (err) {
    if (getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve users when checking for deprecations: the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve users when checking for deprecations, unexpected error: ${getDetailedErrorMessage(
          err
        )}.`
      );
    }
    return deprecationError(packageInfo, err);
  }

  const usersWithKibanaUserRole = Object.values(users)
    .filter((user) => user.roles.includes(KIBANA_USER_ROLE_NAME))
    .map((user) => user.username);
  if (usersWithKibanaUserRole.length === 0) {
    return [];
  }

  // TODO: remove when docs support "main"
  const docsBranch = packageInfo.branch === 'main' ? 'master' : packageInfo.branch;

  return [
    {
      title: getDeprecationTitle(),
      message: getDeprecationMessage(),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/elasticsearch/reference/${docsBranch}/built-in-roles.html`,
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
                'Remove the "{userRoleName}" role from all users and add the "{adminRoleName}" role. The affected users are: {users}.',
              values: {
                userRoleName: KIBANA_USER_ROLE_NAME,
                adminRoleName: KIBANA_ADMIN_ROLE_NAME,
                users: usersWithKibanaUserRole.join(', '),
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
    roleMappings = await client.security.getRoleMapping();
  } catch (err) {
    if (getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve role mappings when checking for deprecations: the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve role mappings when checking for deprecations, unexpected error: ${getDetailedErrorMessage(
          err
        )}.`
      );
    }
    return deprecationError(packageInfo, err);
  }

  const roleMappingsWithKibanaUserRole = Object.entries(roleMappings)
    .filter(([, roleMapping]) => roleMapping.roles.includes(KIBANA_USER_ROLE_NAME))
    .map(([mappingName]) => mappingName);
  if (roleMappingsWithKibanaUserRole.length === 0) {
    return [];
  }

  // TODO: remove when docs support "main"
  const docsBranch = packageInfo.branch === 'main' ? 'master' : packageInfo.branch;

  return [
    {
      title: getDeprecationTitle(),
      message: getDeprecationMessage(),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/elasticsearch/reference/${docsBranch}/built-in-roles.html`,
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
                'Remove the "{userRoleName}" role from all role mappings and add the "{adminRoleName}" role. The affected role mappings are: {roleMappings}.',
              values: {
                userRoleName: KIBANA_USER_ROLE_NAME,
                adminRoleName: KIBANA_ADMIN_ROLE_NAME,
                roleMappings: roleMappingsWithKibanaUserRole.join(', '),
              },
            }
          ),
        ],
      },
    },
  ];
}

function deprecationError(packageInfo: PackageInfo, error: Error): DeprecationsDetails[] {
  const title = getDeprecationTitle();

  // TODO: remove when docs support "main"
  const docsBranch = packageInfo.branch === 'main' ? 'master' : packageInfo.branch;

  if (getErrorStatusCode(error) === 403) {
    return [
      {
        title,
        level: 'fetch_error',
        deprecationType: 'feature',
        message: i18n.translate('xpack.security.deprecations.kibanaUser.forbiddenErrorMessage', {
          defaultMessage: 'You do not have enough permissions to fix this deprecation.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${docsBranch}/xpack-security.html#_required_permissions_7`,
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
