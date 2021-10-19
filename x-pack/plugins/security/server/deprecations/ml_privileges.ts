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
  GetDeprecationsContext,
  Logger,
  PackageInfo,
} from 'src/core/server';

import type { SecurityLicense } from '../../common';
import type {
  PrivilegeDeprecationsRolesResponse,
  PrivilegeDeprecationsService,
} from '../../common/model';
import { isRoleReserved } from '../../common/model';
import { getPrivilegeDeprecationsService } from './privilege_deprecations';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  license: SecurityLicense;
  logger: Logger;
  packageInfo: PackageInfo;
  applicationName: string;
}

function getDeprecationTitle() {
  return i18n.translate('xpack.security.deprecations.mlPrivileges.deprecationTitle', {
    defaultMessage: 'The Machine Learning feature is changing',
  });
}

function getDeprecationMessage() {
  return i18n.translate('xpack.security.deprecations.mlPrivileges.deprecationMessage', {
    defaultMessage:
      'Roles that use base privileges will include the Machine Learning feature in 8.0.',
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

      const privilegeDeprecationService = getPrivilegeDeprecationsService(
        {
          applicationName,
        },
        license,
        logger
      );

      return [...(await getRolesDeprecations(context, privilegeDeprecationService, packageInfo))];
    },
  });
};

async function getRolesDeprecations(
  context: GetDeprecationsContext,
  privilegeDeprecationService: PrivilegeDeprecationsService,
  packageInfo: PackageInfo
): Promise<DeprecationsDetails[]> {
  const response: PrivilegeDeprecationsRolesResponse =
    await privilegeDeprecationService.getKibanaRoles({ context });
  if (response.errors) {
    return response.errors;
  }

  const rolesWithBasePrivileges = (response.roles ?? [])
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
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${packageInfo.branch}/kibana-privileges.html`,
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.security.deprecations.mlPrivileges.manualSteps1', {
            defaultMessage:
              'Change the affected roles to use feature privileges that grant access to only the desired features instead.',
          }),
          i18n.translate('xpack.security.deprecations.mlPrivileges.manualSteps2', {
            defaultMessage:
              "If you don't make any changes, affected roles will grant access to the Machine Learning feature in 8.0.",
          }),
          i18n.translate('xpack.security.deprecations.mlPrivileges.manualSteps3', {
            defaultMessage: 'The affected roles are: {roles}',
            values: {
              roles: rolesWithBasePrivileges.join(', '),
            },
          }),
        ],
      },
    },
  ];
}
