/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from 'src/core/server';

import { DeprecationsDetails, DeprecationsServiceSetup } from '../../../../../src/core/server';
import type { PrivilegeDeprecationsService } from '../../../security/common/model';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../common/constants';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  getKibanaRolesByFeatureId?: PrivilegeDeprecationsService['getKibanaRolesByFeatureId'];
  logger: Logger;
}

export const updateSecuritySolutionPrivileges = (
  siemPrivileges: string[]
): Partial<Record<typeof SERVER_APP_ID | typeof CASES_FEATURE_ID, string[]>> => {
  const siemPrivs = new Set<string>();
  const casesPrivs = new Set<string>();

  for (const priv of siemPrivileges) {
    switch (priv) {
      case 'all':
        siemPrivs.add('all');
        casesPrivs.add('all');
        break;
      case 'read':
        siemPrivs.add('read');
        casesPrivs.add('read');
        break;
      case 'minimal_all':
        siemPrivs.add('all');
        break;
      case 'minimal_read':
        siemPrivs.add('read');
        break;
      case 'cases_all':
        casesPrivs.add('all');
        break;
      case 'cases_read':
        casesPrivs.add('read');
        break;
    }
  }

  const newSiemPrivileges: string[] = siemPrivs.has('all')
    ? ['all']
    : siemPrivs.has('read')
    ? ['read']
    : [];

  const casePrivileges: string[] = casesPrivs.has('all')
    ? ['all']
    : casesPrivs.has('read')
    ? ['read']
    : [];

  return {
    ...(newSiemPrivileges.length > 0
      ? {
          [SERVER_APP_ID]: newSiemPrivileges,
        }
      : {}),
    ...(casePrivileges.length > 0
      ? {
          [CASES_FEATURE_ID]: casePrivileges,
        }
      : {}),
  };
};

export const registerPrivilegeDeprecations = ({
  deprecationsService,
  getKibanaRolesByFeatureId,
  logger,
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      let deprecatedRoles: DeprecationsDetails[] = [];
      if (!getKibanaRolesByFeatureId) {
        return deprecatedRoles;
      }
      const responseRoles = await getKibanaRolesByFeatureId({
        context,
        featureId: 'siem',
      });

      if (responseRoles.errors && responseRoles.errors.length > 0) {
        return responseRoles.errors;
      }

      try {
        const roles = responseRoles.roles ?? [];
        deprecatedRoles = roles.map<DeprecationsDetails>((role) => {
          const { metadata, elasticsearch, kibana } = role;

          const updatedKibana = kibana.map((privilege) => {
            const { siem, ...otherFeatures } = privilege.feature;
            const privilegeContainsSiem = Array.isArray(siem) && siem.length > 0;

            if (privilegeContainsSiem) {
              return {
                ...privilege,
                feature: {
                  ...otherFeatures,
                  ...updateSecuritySolutionPrivileges(siem),
                },
              };
            }
            return privilege;
          });

          const updatedRole = {
            metadata,
            elasticsearch,
            kibana: updatedKibana,
          };

          return {
            title: i18n.translate(
              'xpack.securitySolution.privilegeDeprecations.casesSubFeaturePrivileges.title',
              {
                defaultMessage: 'The "{roleName}" role needs to be updated',
                values: { roleName },
              }
            ),
            message: i18n.translate(
              'xpack.securitySolution.privilegeDeprecations.casesSubFeaturePrivileges.message',
              {
                defaultMessage:
                  'The "Security" feature will be split into two separate features in 8.0. The "{roleName}" role grants access to this feature, and it needs to be updated before you upgrade Kibana. This will ensure that users have access to the same features after the upgrade.',
                values: { roleName },
              }
            ),
            level: 'warning',
            correctiveActions: {
              api: {
                method: 'PUT',
                path: `/api/security/role/${encodeURIComponent(role.name)}`,
                body: updatedRole,
              },
              manualSteps: [],
            },
          };
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'n/a';
        const message = i18n.translate(
          'xpack.securitySolution.privilegeDeprecations.error.casesSubFeaturePrivileges.message',
          {
            defaultMessage: `Failed to create cases roles from siem roles, unexpected error: {message}`,
            values: {
              message: errMsg,
            },
          }
        );
        logger.error(
          `Failed to create cases roles from siem roles, unexpected error: ${errMsg ?? ''}`
        );
        return [
          {
            title: i18n.translate(
              'xpack.securitySolution.privilegeDeprecations.error.casesSubFeaturePrivileges.title',
              {
                defaultMessage: `Error in security solution to deprecate cases sub feature`,
              }
            ),
            level: 'fetch_error',
            message,
            correctiveActions: {
              manualSteps: [
                i18n.translate(
                  'xpack.securitySolution.privilegeDeprecations.manualSteps.casesSubFeaturePrivileges.message',
                  {
                    defaultMessage:
                      'A user will have to set cases privileges manually in your associated role',
                  }
                ),
              ],
            },
          },
        ];
      }
      return deprecatedRoles;
    },
  });
};
