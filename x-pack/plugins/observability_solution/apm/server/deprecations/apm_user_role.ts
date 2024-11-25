/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SecurityGetRoleMappingResponse,
  SecurityGetUserResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  CoreSetup,
  DeprecationsDetails,
  DocLinksServiceSetup,
  ElasticsearchClient,
  GetDeprecationsContext,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { DeprecationApmDeps } from '.';
import { deprecations } from '../lib/deprecations';

const APM_USER_ROLE_NAME = 'apm_user';
const getKibanaPrivilegesDocumentationUrl = (branch: string) => {
  return `https://www.elastic.co/guide/en/kibana/${branch}/kibana-privileges.html`;
};

export async function getDeprecationsInfo(
  { esClient }: GetDeprecationsContext,
  core: CoreSetup,
  apmDeps: DeprecationApmDeps
) {
  const client = esClient.asCurrentUser;
  const { docLinks } = core;
  const { security } = apmDeps;

  // Nothing to do if security is disabled
  if (!security?.license.isEnabled()) {
    return [];
  }

  const [userDeprecations, roleMappingDeprecations] = await Promise.all([
    getUsersDeprecations(client, apmDeps, docLinks),
    getRoleMappingsDeprecations(client, apmDeps, docLinks),
  ]);

  return [...userDeprecations, ...roleMappingDeprecations];
}

async function getUsersDeprecations(
  client: ElasticsearchClient,
  apmDeps: DeprecationApmDeps,
  docLinks: DocLinksServiceSetup
): Promise<DeprecationsDetails[]> {
  const title = i18n.translate('xpack.apm.deprecations.apmUser.title', {
    defaultMessage: `Check for users assigned the deprecated "{apmUserRoleName}" role`,
    values: { apmUserRoleName: APM_USER_ROLE_NAME },
  });

  let users: SecurityGetUserResponse;
  try {
    users = await client.security.getUser();
  } catch (err) {
    const { logger } = apmDeps;
    if (deprecations.getErrorStatusCode(err) === 403) {
      logger.warn(
        'Failed to retrieve users when checking for deprecations: the "read_security" or "manage_security" cluster privilege is required.'
      );
    } else {
      logger.error(
        `Failed to retrieve users when checking for deprecations, unexpected error: ${deprecations.getDetailedErrorMessage(
          err
        )}.`
      );
    }
    return deprecations.deprecationError(title, err, docLinks);
  }

  const apmUsers = Object.values(users).flatMap((user) =>
    user.roles.find(hasApmUserRole) ? user.username : []
  );

  if (apmUsers.length === 0) {
    return [];
  }

  return [
    {
      title,
      message: i18n.translate('xpack.apm.deprecations.apmUser.description', {
        defaultMessage: `The "{apmUserRoleName}" role has been deprecated. Remove the "{apmUserRoleName}" role from affected users in this cluster including: {users}`,
        values: { apmUserRoleName: APM_USER_ROLE_NAME, users: apmUsers.join() },
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.apm.deprecations.apmUser.manualStepOne', {
            defaultMessage: `Go to Management > Security > Users to find users with the "{apmUserRoleName}" role.`,
            values: { apmUserRoleName: APM_USER_ROLE_NAME },
          }),
          i18n.translate('xpack.apm.deprecations.apmUser.manualStepTwo', {
            defaultMessage:
              'Remove the "{apmUserRoleName}" role from all users and add the built-in "viewer" role.',
            values: { apmUserRoleName: APM_USER_ROLE_NAME },
          }),
        ],
      },
      level: 'critical',
      deprecationType: 'feature',
      documentationUrl: getKibanaPrivilegesDocumentationUrl(docLinks.version),
    },
  ];
}

async function getRoleMappingsDeprecations(
  client: ElasticsearchClient,
  apmDeps: DeprecationApmDeps,
  docLinks: DocLinksServiceSetup
): Promise<DeprecationsDetails[]> {
  const title = i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.title', {
    defaultMessage: `Check for role mappings using the deprecated "{apmUserRoleName}" role`,
    values: { apmUserRoleName: APM_USER_ROLE_NAME },
  });

  let roleMappings: SecurityGetRoleMappingResponse;
  try {
    roleMappings = await client.security.getRoleMapping();
  } catch (err) {
    const { logger } = apmDeps;
    if (deprecations.getErrorStatusCode(err) === 403) {
      logger.warn(
        'Failed to retrieve role mappings when checking for deprecations: the "manage_security" cluster privilege is required.'
      );
    } else {
      logger.error(
        `Failed to retrieve role mappings when checking for deprecations, unexpected error: ${deprecations.getDetailedErrorMessage(
          err
        )}.`
      );
    }
    return deprecations.deprecationError(title, err, docLinks);
  }

  const roleMappingsWithApmUserRole = Object.entries(roleMappings).flatMap(([roleName, role]) =>
    role.roles?.find(hasApmUserRole) ? roleName : []
  );

  if (roleMappingsWithApmUserRole.length === 0) {
    return [];
  }

  return [
    {
      title,
      message: i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.description', {
        defaultMessage: `The "{apmUserRoleName}" role has been deprecated. Remove the "{apmUserRoleName}" role from affected role mappings in this cluster including: {roles}`,
        values: {
          apmUserRoleName: APM_USER_ROLE_NAME,
          roles: roleMappingsWithApmUserRole.join(),
        },
      }),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.manualStepOne', {
            defaultMessage: `Go to Management > Security > Role Mappings to find roles mappings with the "{apmUserRoleName}" role.`,
            values: { apmUserRoleName: APM_USER_ROLE_NAME },
          }),
          i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.manualStepTwo', {
            defaultMessage:
              'Remove the "{apmUserRoleName}" role from all role mappings and add the built-in "viewer" role',
            values: { apmUserRoleName: APM_USER_ROLE_NAME },
          }),
        ],
      },
      level: 'critical',
      deprecationType: 'feature',
      documentationUrl: getKibanaPrivilegesDocumentationUrl(docLinks.version),
    },
  ];
}

const hasApmUserRole = (role: string) => role === APM_USER_ROLE_NAME;
