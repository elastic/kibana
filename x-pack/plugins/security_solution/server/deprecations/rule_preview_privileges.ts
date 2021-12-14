/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DeprecationsServiceSetup, PackageInfo } from 'src/core/server';
import type { PrivilegeDeprecationsService, Role } from '../../../security/common/model';
import { DEFAULT_SIGNALS_INDEX } from '../../common/constants';

const PREVIEW_INDEX_PREFIX = '.preview.alerts-security.alerts';
const READ_PRIVILEGES = ['all', 'read'];

export const roleHasReadAccess = (role: Role, indexPrefix = DEFAULT_SIGNALS_INDEX): boolean =>
  role.elasticsearch.indices.some(
    (index) =>
      index.names.some((indexName) => indexName.startsWith(indexPrefix)) &&
      index.privileges.some((indexPrivilege) => READ_PRIVILEGES.includes(indexPrivilege))
  );

export const roleIsExternal = (role: Role): boolean => role.metadata?._reserved !== true;

const buildManualSteps = (roleNames: string[]): string[] => {
  const baseSteps = [
    i18n.translate('xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep1', {
      defaultMessage:
        'Update your roles to include read privileges for the detection alerts preview indices appropriate for that role and space(s).',
    }),
    i18n.translate('xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep2', {
      defaultMessage:
        'In 8.0, users will be unable to view preview results until those permissions are added.',
    }),
  ];
  const informationalStep = i18n.translate(
    'xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep3',
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
  packageInfo: PackageInfo;
}

export const registerRulePreviewPrivilegeDeprecations = ({
  deprecationsService,
  getKibanaRoles,
  packageInfo,
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
              !roleHasReadAccess(role, PREVIEW_INDEX_PREFIX)
          ) ?? [];
      }

      if (rolesWhichReadSignals.length === 0) {
        return [];
      }

      const roleNamesWhichReadSignals = rolesWhichReadSignals.map((role) => role.name);

      return [
        {
          title: i18n.translate('xpack.securitySolution.deprecations.rulePreviewPrivileges.title', {
            defaultMessage: 'The Detections Rule Preview feature is changing',
          }),
          message: i18n.translate(
            'xpack.securitySolution.deprecations.rulePreviewPrivileges.message',
            {
              values: {
                previewIndexPrefix: PREVIEW_INDEX_PREFIX,
                signalsIndexPrefix: DEFAULT_SIGNALS_INDEX,
              },
              defaultMessage:
                'In order to enable a more robust preview in 8.0+, users will need read privileges to new detection alerts preview indices ({previewIndexPrefix}-<KIBANA_SPACE>), analogous to existing detection alerts indices ({signalsIndexPrefix}-<KIBANA_SPACE>).',
            }
          ),
          level: 'warning',
          deprecationType: 'feature',
          documentationUrl: `https://www.elastic.co/guide/en/security/${packageInfo.branch}/rules-ui-create.html#preview-rules`,
          correctiveActions: {
            manualSteps: buildManualSteps(roleNamesWhichReadSignals),
          },
        },
      ];
    },
  });
};
