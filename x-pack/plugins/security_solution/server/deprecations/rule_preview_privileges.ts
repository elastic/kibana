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

        rolesWhichReadSignals = roles?.filter(roleHasSignalsReadAccess) ?? [];
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
              defaultMessage: `In order to enable a more robust preview, users will need read privileges to new signals preview indices (.siem-preview-signals-<KIBANA_SPACE>), analogous to existing signals indices (${DEFAULT_SIGNALS_INDEX}-<KIBANA_SPACE>).`,
            }
          ),
          level: 'warning',
          deprecationType: 'feature',
          documentationUrl: `https://www.elastic.co/guide/en/security/${packageInfo.branch}/rules-ui-create.html#preview-rules`,
          correctiveActions: {
            manualSteps: [
              i18n.translate(
                'xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep1',
                {
                  defaultMessage:
                    'Update your roles to include read privileges for the signals preview indices appropriate for that role and space(s).',
                }
              ),
              i18n.translate(
                'xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep2',
                {
                  defaultMessage:
                    'In 8.0, users will be unable to view preview results until those permissions are added.',
                }
              ),
              i18n.translate(
                'xpack.securitySolution.deprecations.rulePreviewPrivileges.manualStep3',
                {
                  defaultMessage:
                    'The roles that currently have read access to signals indices are: {roles}',
                  values: {
                    roles: roleNamesWhichReadSignals.join(', '),
                  },
                }
              ),
            ],
          },
        },
      ];
    },
  });
};

const READ_PRIVILEGES = ['all', 'read'];

const roleHasSignalsReadAccess = (role: Role): boolean =>
  role.elasticsearch.indices.some(
    (index) =>
      index.names.some((indexName) => indexName.startsWith(DEFAULT_SIGNALS_INDEX)) &&
      index.privileges.some((indexPrivilege) => READ_PRIVILEGES.includes(indexPrivilege))
  );
