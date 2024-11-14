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

  return [
    ...(await getUsersDeprecations(client, apmDeps, docLinks)),
    ...(await getRoleMappingsDeprecations(client, apmDeps, docLinks)),
  ];
}

async function getUsersDeprecations(
  client: ElasticsearchClient,
  apmDeps: DeprecationApmDeps,
  docLinks: DocLinksServiceSetup
): Promise<DeprecationsDetails[]> {
  const strings = {
    title: i18n.translate('xpack.apm.deprecations.apmUser.title', {
      defaultMessage: `The "{apmUserRoleName}" role has been removed: check user roles`,
      values: { apmUserRoleName: APM_USER_ROLE_NAME },
    }),
    message: i18n.translate('xpack.apm.deprecations.apmUser.description', {
      defaultMessage: `The "{apmUserRoleName}" has been removed and this cluster has users with the removed role.`,
      values: { apmUserRoleName: APM_USER_ROLE_NAME },
    }),
    manualSteps: (usersRoles: string) => [
      i18n.translate('xpack.apm.deprecations.apmUser.manualStepOne', {
        defaultMessage: `Go to Management > Security > Users to find users with the "{apmUserRoleName}" role.`,
        values: { apmUserRoleName: APM_USER_ROLE_NAME },
      }),
      i18n.translate('xpack.apm.deprecations.apmUser.manualStepTwo', {
        defaultMessage:
          `Remove the "{apmUserRoleName}" role from all users and add the built-in "viewer" roles.` +
          ` The affected users are: {usersRoles}.`,
        values: { apmUserRoleName: APM_USER_ROLE_NAME, usersRoles },
      }),
    ],
  };

  let users: SecurityGetUserResponse;
  try {
    users = await client.security.getUser();
  } catch (err) {
    const { logger } = apmDeps;
    if (deprecations.getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve users when checking for deprecations:` +
          ` the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve users when checking for deprecations,` +
          ` unexpected error: ${deprecations.getDetailedErrorMessage(err)}.`
      );
    }
    return deprecations.deprecationError(strings.title, err, docLinks);
  }

  const reportingUsers = Object.entries(users).reduce((userSet, current) => {
    const [userName, user] = current;
    const foundRole = user.roles.find(hasApmUserRole);
    if (foundRole) {
      userSet.push(`${userName}[${foundRole}]`);
    }
    return userSet;
  }, [] as string[]);

  if (reportingUsers.length === 0) {
    return [];
  }

  return [
    {
      title: strings.title,
      message: strings.message,
      correctiveActions: { manualSteps: strings.manualSteps(reportingUsers.join(', ')) },
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
  const strings = {
    title: i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.title', {
      defaultMessage: `The "{apmUserRoleName}" role has been removed: check role mappings`,
      values: { apmUserRoleName: APM_USER_ROLE_NAME },
    }),
    message: i18n.translate('xpack.apm.deprecations.apmUser.description', {
      defaultMessage: `The "{apmUserRoleName}" role has been removed.`,
      values: { apmUserRoleName: APM_USER_ROLE_NAME },
    }),
    manualSteps: (roleMappings: string) => [
      i18n.translate('xpack.apm.deprecations.apmUser.manualStepOne', {
        defaultMessage: `Go to Management > Security > Roles to find roles with the "{apmUserRoleName}" role.`,
        values: { apmUserRoleName: APM_USER_ROLE_NAME },
      }),
      i18n.translate('xpack.apm.deprecations.apmUserRoleMappings.manualStepFive', {
        defaultMessage:
          `Remove the "{apmUserRoleName}" role from all role mappings and add the built-in "viewer" roles.` +
          ` The affected role mappings are: {roleMappings}.`,
        values: { apmUserRoleName: APM_USER_ROLE_NAME, roleMappings },
      }),
    ],
  };

  let roleMappings: SecurityGetRoleMappingResponse;
  try {
    roleMappings = await client.security.getRoleMapping();
  } catch (err) {
    const { logger } = apmDeps;
    if (deprecations.getErrorStatusCode(err) === 403) {
      logger.warn(
        `Failed to retrieve role mappings when checking for deprecations:` +
          ` the "manage_security" cluster privilege is required.`
      );
    } else {
      logger.error(
        `Failed to retrieve role mappings when checking for deprecations,` +
          ` unexpected error: ${deprecations.getDetailedErrorMessage(err)}.`
      );
    }
    return deprecations.deprecationError(strings.title, err, docLinks);
  }

  const roleMappingsWithReportingRole: string[] = Object.entries(roleMappings).reduce(
    (roleSet, current) => {
      const [roleName, role] = current;
      const foundMapping = role.roles?.find(hasApmUserRole);
      if (foundMapping) {
        roleSet.push(`${roleName}[${foundMapping}]`);
      }
      return roleSet;
    },
    [] as string[]
  );

  if (roleMappingsWithReportingRole.length === 0) {
    return [];
  }

  return [
    {
      title: strings.title,
      message: strings.message,
      correctiveActions: {
        manualSteps: strings.manualSteps(roleMappingsWithReportingRole.join(', ')),
      },
      level: 'critical',
      deprecationType: 'feature',
      documentationUrl: getKibanaPrivilegesDocumentationUrl(docLinks.version),
    },
  ];
}

const hasApmUserRole = (role: string) => role === APM_USER_ROLE_NAME;
