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
import { i18n } from '@kbn/i18n';
import type {
  DeprecationsDetails,
  ElasticsearchClient,
  GetDeprecationsContext,
} from 'src/core/server';
import { ReportingCore } from '../';
import { deprecations } from '../lib/deprecations';

const REPORTING_USER_ROLE_NAME = 'reporting_user';
const getDocumentationUrl = (branch: string) => {
  // TODO: remove when docs support "main"
  const docBranch = branch === 'main' ? 'master' : branch;
  return `https://www.elastic.co/guide/en/kibana/${docBranch}/kibana-privileges.html`;
};

interface ExtraDependencies {
  reportingCore: ReportingCore;
}

export async function getDeprecationsInfo(
  { esClient }: GetDeprecationsContext,
  { reportingCore }: ExtraDependencies
): Promise<DeprecationsDetails[]> {
  const client = esClient.asCurrentUser;
  const { security } = reportingCore.getPluginSetupDeps();

  // Nothing to do if security is disabled
  if (!security?.license.isEnabled()) {
    return [];
  }

  const config = reportingCore.getConfig();
  const deprecatedRoles = config.get('roles', 'allow') || ['reporting_user'];

  return [
    ...(await getUsersDeprecations(client, reportingCore, deprecatedRoles)),
    ...(await getRoleMappingsDeprecations(client, reportingCore, deprecatedRoles)),
  ];
}

async function getUsersDeprecations(
  client: ElasticsearchClient,
  reportingCore: ReportingCore,
  deprecatedRoles: string[]
): Promise<DeprecationsDetails[]> {
  const usingDeprecatedConfig = !reportingCore.getContract().usesUiCapabilities();
  const strings = {
    title: i18n.translate('xpack.reporting.deprecations.reportingRoleUsersTitle', {
      defaultMessage: 'The "{reportingUserRoleName}" role is deprecated: check user roles',
      values: { reportingUserRoleName: REPORTING_USER_ROLE_NAME },
    }),
    message: i18n.translate('xpack.reporting.deprecations.reportingRoleUsersMessage', {
      defaultMessage:
        'Existing users have their Reporting privilege granted by a deprecated setting.',
    }),
    manualSteps: (usersRoles: string) => [
      ...(usingDeprecatedConfig
        ? [
            i18n.translate('xpack.reporting.deprecations.reportingRoleUsers.manualStepOne', {
              defaultMessage: 'Set "xpack.reporting.roles.enabled: false" in kibana.yml.',
            }),
            i18n.translate('xpack.reporting.deprecations.reportingRoleUsers.manualStepTwo', {
              defaultMessage: 'Remove "xpack.reporting.roles.allow" in kibana.yml, if present.',
            }),
          ]
        : []),

      i18n.translate('xpack.reporting.deprecations.reportingRoleUsers.manualStepThree', {
        defaultMessage: 'Create a custom role with Kibana privileges to grant access to Reporting.',
      }),
      i18n.translate('xpack.reporting.deprecations.reportingRoleUsers.manualStepFour', {
        defaultMessage:
          'Remove the "reporting_user" role from all users and add the custom role. The affected users are: {usersRoles}.',
        values: { usersRoles },
      }),
    ],
  };

  let users: SecurityGetUserResponse;
  try {
    users = (await client.security.getUser()).body;
  } catch (err) {
    const { logger } = reportingCore.getPluginSetupDeps();
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
    return deprecations.deprecationError(strings.title, err);
  }

  const reportingUsers = Object.entries(users).reduce((userSet, current) => {
    const [userName, user] = current;
    const foundRole = user.roles.find((role) => deprecatedRoles.includes(role));
    return foundRole ? [...userSet, `${userName}[${foundRole}]`] : userSet;
  }, [] as string[]);

  if (reportingUsers.length === 0) {
    return [];
  }

  return [
    {
      title: strings.title,
      message: strings.message,
      correctiveActions: { manualSteps: strings.manualSteps(reportingUsers.join(', ')) },
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: getDocumentationUrl(reportingCore.getKibanaPackageInfo().branch),
    },
  ];
}

async function getRoleMappingsDeprecations(
  client: ElasticsearchClient,
  reportingCore: ReportingCore,
  deprecatedRoles: string[]
): Promise<DeprecationsDetails[]> {
  const usingDeprecatedConfig = !reportingCore.getContract().usesUiCapabilities();
  const strings = {
    title: i18n.translate('xpack.reporting.deprecations.reportingRoleMappingsTitle', {
      defaultMessage: 'The "{reportingUserRoleName}" role is deprecated: check role mappings',
      values: { reportingUserRoleName: REPORTING_USER_ROLE_NAME },
    }),
    message: i18n.translate('xpack.reporting.deprecations.reportingRoleMappingsMessage', {
      defaultMessage: 'Existing roles are mapped to a deprecated role for Reporting privileges',
    }),
    manualSteps: (roleMappings: string) => [
      ...(usingDeprecatedConfig
        ? [
            i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepOne', {
              defaultMessage: 'Set "xpack.reporting.roles.enabled: false" in kibana.yml.',
            }),
            i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepTwo', {
              defaultMessage: 'Remove "xpack.reporting.roles.allow" in kibana.yml, if present.',
            }),
          ]
        : []),

      i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepThree', {
        defaultMessage: 'Create a custom role with Kibana privileges to grant access to Reporting.',
      }),
      i18n.translate('xpack.reporting.deprecations.reportingRoleMappings.manualStepFour', {
        defaultMessage:
          'Remove the "reporting_user" role from all role mappings and add the custom role. The affected role mappings are: {roleMappings}.',
        values: { roleMappings },
      }),
    ],
  };

  let roleMappings: SecurityGetRoleMappingResponse;
  try {
    roleMappings = (await client.security.getRoleMapping()).body;
  } catch (err) {
    const { logger } = reportingCore.getPluginSetupDeps();
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
    return deprecations.deprecationError(strings.title, err);
  }

  const roleMappingsWithReportingRole: string[] = Object.entries(roleMappings).reduce(
    (roleSet, current) => {
      const [roleName, role] = current;
      const foundMapping = role.roles.find((roll) => deprecatedRoles.includes(roll));
      return foundMapping ? [...roleSet, `${roleName}[${foundMapping}]`] : roleSet;
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
      level: 'warning',
      deprecationType: 'feature',
      documentationUrl: getDocumentationUrl(reportingCore.getKibanaPackageInfo().branch),
    },
  ];
}
