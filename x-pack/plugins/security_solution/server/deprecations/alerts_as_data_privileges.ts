/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DeprecationsServiceSetup } from 'src/core/server';
import type { PrivilegeDeprecationsService, Role } from '../../../security/common/model';
import { DEFAULT_SIGNALS_INDEX } from '../../common/constants';
import { roleHasReadAccess, roleIsExternal } from './utils';

const ALERTS_INDEX_PREFIX = '.alerts-security.alerts';
const INTERNAL_ALERTS_INDEX_PREFIX = '.internal.alerts-security.alerts';

const buildManualSteps = (roleNames: string[]): string[] => {
  const baseSteps = [
    i18n.translate('xpack.securitySolution.deprecations.alertsIndexPrivileges.manualStep1', {
      defaultMessage:
        'Update your roles to include read privileges for the detection alerts indices appropriate for that role and space(s).',
    }),
    i18n.translate('xpack.securitySolution.deprecations.alertsIndexPrivileges.manualStep2', {
      defaultMessage:
        'In 8.0, users will be unable to view alerts until those permissions are added.',
    }),
  ];
  const informationalStep = i18n.translate(
    'xpack.securitySolution.deprecations.alertsIndexPrivileges.manualStep3',
    {
      defaultMessage:
        'The roles that currently have read access to detection alerts indices are: {roles}',
      values: {
        roles: roleNames.join(', '),
      },
    }
  );

  if (roleNames.length === 0) {
    return baseSteps;
  } else {
    return [...baseSteps, informationalStep];
  }
};

interface Dependencies {
  deprecationsService: DeprecationsServiceSetup;
  getKibanaRoles?: PrivilegeDeprecationsService['getKibanaRoles'];
}

export const registerAlertsIndexPrivilegeDeprecations = ({
  deprecationsService,
  getKibanaRoles,
}: Dependencies) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      let rolesWhichReadSignals: Role[] = [];

      if (getKibanaRoles) {
        const { roles, errors } = await getKibanaRoles({ context });
        if (errors?.length) {
          return errors;
        }

        rolesWhichReadSignals =
          roles?.filter(
            (role) =>
              roleIsExternal(role) &&
              roleHasReadAccess(role) &&
              (!roleHasReadAccess(role, ALERTS_INDEX_PREFIX) ||
                !roleHasReadAccess(role, INTERNAL_ALERTS_INDEX_PREFIX))
          ) ?? [];
      }

      if (rolesWhichReadSignals.length === 0) {
        return [];
      }

      const roleNamesWhichReadSignals = rolesWhichReadSignals.map((role) => role.name);

      return [
        {
          title: i18n.translate('xpack.securitySolution.deprecations.alertsIndexPrivileges.title', {
            defaultMessage: 'The Detection Alerts index names are changing',
          }),
          message: i18n.translate(
            'xpack.securitySolution.deprecations.alertsIndexPrivileges.message',
            {
              values: {
                alertsIndexPrefix: ALERTS_INDEX_PREFIX,
                internalAlertsIndexPrefix: INTERNAL_ALERTS_INDEX_PREFIX,
                signalsIndexPrefix: DEFAULT_SIGNALS_INDEX,
              },
              defaultMessage: `In order to view detection alerts in 8.0+, users will need read privileges to new detection alerts index aliases \
({alertsIndexPrefix}-<KIBANA_SPACE>) and backing indices ({internalAlertsIndexPrefix}-<KIBANA_SPACE>-*), \
analogous to existing detection alerts indices ({signalsIndexPrefix}-<KIBANA_SPACE>). \
In addition, any enabled Detection rules will be automatically disabled during the upgrade and must be manually re-enabled after \
upgrading. Rules that are automatically disabled will also automatically be tagged to assist in manually re-enabling them post-upgrade. \
Alerts created after upgrading will use a different schema.`,
            }
          ),
          level: 'warning',
          deprecationType: 'feature',
          documentationUrl: `https://www.elastic.co/guide/en/security/8.0/whats-new.html#index-updates-8.0`,
          correctiveActions: {
            manualSteps: buildManualSteps(roleNamesWhichReadSignals),
          },
        },
      ];
    },
  });
};
