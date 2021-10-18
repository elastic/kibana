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

      const privilegeDeprecationService = getPrivilegeDeprecationsService(
        {
          applicationName,
        },
        license,
        logger
      );

      return [...(await getRolesDeprecations(context, privilegeDeprecationService))];
    },
  });
};

async function getRolesDeprecations(
  context: GetDeprecationsContext,
  privilegeDeprecationService: PrivilegeDeprecationsService
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
