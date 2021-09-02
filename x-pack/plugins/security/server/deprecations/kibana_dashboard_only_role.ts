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

export const KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME = 'kibana_dashboard_only_user';

export interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  license: SecurityLicense;
  logger: Logger;
  packageInfo: PackageInfo;
}

export const registerKibanaDashboardOnlyRoleDeprecation = ({
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

  const usersWithKibanaDashboardOnlyRole = Object.values(users)
    .filter((user) => user.roles.includes(KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME))
    .map((user) => user.username);
  if (usersWithKibanaDashboardOnlyRole.length === 0) {
    return [];
  }

  return [
    {
      title: i18n.translate(
        'xpack.security.deprecations.kibanaDashboardOnlyUser.deprecationTitle',
        {
          defaultMessage: 'The "{roleName}" role is removed',
          values: { roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME },
        }
      ),
      message: i18n.translate(
        'xpack.security.deprecations.kibanaDashboardOnlyUser.usersDeprecationMessage',
        {
          defaultMessage:
            'The following users have a deprecated and removed "{roleName}" role: {users}. Create a custom role with Kibana privileges to restrict access to just the Dashboard feature instead.',
          values: {
            roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME,
            users: usersWithKibanaDashboardOnlyRole.join(', '),
          },
        }
      ),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/kibana-privileges.html`,
      correctiveActions: {
        manualSteps: [
          i18n.translate(
            'xpack.security.deprecations.kibanaDashboardOnlyUser.usersDeprecationCorrectiveActionOne',
            {
              defaultMessage:
                'Create a custom role with Kibana privileges to restrict access to just the Dashboard feature.',
            }
          ),
          i18n.translate(
            'xpack.security.deprecations.kibanaDashboardOnlyUser.usersDeprecationCorrectiveActionTwo',
            {
              defaultMessage:
                'Update all users with "{roleName}" role to use the custom role instead.',
              values: { roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME },
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

  const roleMappingsWithKibanaDashboardOnlyRole = Object.entries(roleMappings)
    .filter(([, roleMapping]) => roleMapping.roles.includes(KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME))
    .map(([mappingName]) => mappingName);
  if (roleMappingsWithKibanaDashboardOnlyRole.length === 0) {
    return [];
  }

  return [
    {
      title: i18n.translate(
        'xpack.security.deprecations.kibanaDashboardOnlyUser.deprecationTitle',
        {
          defaultMessage: 'The "{roleName}" role is removed',
          values: { roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME },
        }
      ),
      message: i18n.translate(
        'xpack.security.deprecations.kibanaDashboardOnlyUser.roleMappingsDeprecationMessage',
        {
          defaultMessage:
            'The following role mappings map to a deprecated and removed "{roleName}" role: {roleMappings}. Create a custom role with Kibana privileges to restrict access to just the Dashboard feature instead.',
          values: {
            roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME,
            roleMappings: roleMappingsWithKibanaDashboardOnlyRole.join(', '),
          },
        }
      ),
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/kibana-privileges.html`,
      correctiveActions: {
        manualSteps: [
          i18n.translate(
            'xpack.security.deprecations.kibanaDashboardOnlyUser.roleMappingsDeprecationCorrectiveActionOne',
            {
              defaultMessage:
                'Create a custom role with Kibana privileges to restrict access to just the Dashboard feature.',
            }
          ),
          i18n.translate(
            'xpack.security.deprecations.kibanaDashboardOnlyUser.roleMappingsDeprecationCorrectiveActionTwo',
            {
              defaultMessage:
                'Update all role mappings that map to "{roleName}" role to use the custom role instead.',
              values: { roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME },
            }
          ),
        ],
      },
    },
  ];
}

function deprecationError(packageInfo: PackageInfo, error: Error): DeprecationsDetails[] {
  const title = i18n.translate(
    'xpack.security.deprecations.kibanaDashboardOnlyUser.deprecationTitle',
    {
      defaultMessage: 'The "{roleName}" role is removed',
      values: { roleName: KIBANA_DASHBOARD_ONLY_USER_ROLE_NAME },
    }
  );

  if (getErrorStatusCode(error) === 403) {
    return [
      {
        title,
        level: 'fetch_error',
        deprecationType: 'feature',
        message: i18n.translate(
          'xpack.security.deprecations.kibanaDashboardOnlyUser.forbiddenErrorMessage',
          { defaultMessage: 'You do not have enough permissions to fix this deprecation.' }
        ),
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/xpack-security.html#_required_permissions_7`,
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.security.deprecations.kibanaDashboardOnlyUser.forbiddenErrorCorrectiveAction',
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
      message: i18n.translate(
        'xpack.security.deprecations.kibanaDashboardOnlyUser.unknownErrorMessage',
        {
          defaultMessage:
            'Failed to perform deprecation check. Check Kibana logs for more details.',
        }
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate(
            'xpack.security.deprecations.kibanaDashboardOnlyUser.unknownErrorCorrectiveAction',
            { defaultMessage: 'Check Kibana logs for more details.' }
          ),
        ],
      },
    },
  ];
}
