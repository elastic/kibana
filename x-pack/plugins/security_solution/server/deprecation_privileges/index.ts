/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from 'src/core/server';

import { DeprecationsDetails, DeprecationsServiceSetup } from '../../../../../src/core/server';
import type { PrivilegeDeprecationsService, Role } from '../../../security/common/model';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../common/constants';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  getKibanaRoles?: PrivilegeDeprecationsService['getKibanaRoles'];
  logger: Logger;
}

export const updateSecuritySolutionPrivileges = (
  siemPrivileges: string[]
): Partial<Record<typeof SERVER_APP_ID | typeof CASES_FEATURE_ID, string[]>> => {
  const casesPrivs = new Set<string>();

  for (const priv of siemPrivileges) {
    switch (priv) {
      case 'all':
        casesPrivs.add('all');
        break;
      case 'read':
        casesPrivs.add('read');
        break;
      case 'cases_all':
        casesPrivs.add('all');
        break;
      case 'cases_read':
        casesPrivs.add('read');
        break;
    }
  }

  const casePrivileges: string[] = casesPrivs.has('all')
    ? ['all']
    : casesPrivs.has('read')
    ? ['read']
    : [];

  return {
    ...(siemPrivileges.length > 0
      ? {
          [SERVER_APP_ID]: siemPrivileges,
        }
      : {}),
    ...(casePrivileges.length > 0
      ? {
          [CASES_FEATURE_ID]: casePrivileges,
        }
      : {}),
  };
};

const SIEM_PRIVILEGES_FOR_CASES = new Set(['all', 'read', 'cases_all', 'cases_read']);
function outdatedSiemRolePredicate(role: Role) {
  return role.kibana.some(
    ({ feature }) =>
      !feature[CASES_FEATURE_ID] &&
      feature.siem &&
      feature.siem.some((x) => SIEM_PRIVILEGES_FOR_CASES.has(x))
  );
}

export const registerPrivilegeDeprecations = ({
  deprecationsService,
  getKibanaRoles,
  logger,
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      let deprecatedRoles: DeprecationsDetails[] = [];
      if (!getKibanaRoles) {
        return deprecatedRoles;
      }
      const responseRoles = await getKibanaRoles({
        context,
        featureId: 'siem',
      });

      if (responseRoles.errors && responseRoles.errors.length > 0) {
        return responseRoles.errors;
      }

      try {
        const filteredRoles = (responseRoles.roles ?? []).filter(outdatedSiemRolePredicate);
        deprecatedRoles = filteredRoles.map<DeprecationsDetails>((role) => {
          const { metadata, elasticsearch, kibana, name: roleName } = role;

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
                defaultMessage:
                  'The Security feature is changing, and the "{roleName}" role requires an update',
                values: { roleName },
              }
            ),
            message: i18n.translate(
              'xpack.securitySolution.privilegeDeprecations.casesSubFeaturePrivileges.message',
              {
                defaultMessage:
                  'The Security feature will be split into the Security and Cases features in 8.0. The "{roleName}" role grants access to the Security feature only. Update the role to also grant access to the Cases feature.',
                values: { roleName },
              }
            ),
            level: 'warning',
            deprecationType: 'feature',
            correctiveActions: {
              api: {
                method: 'PUT',
                path: `/api/security/role/${encodeURIComponent(role.name)}`,
                body: updatedRole,
                omitContextFromBody: true,
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
