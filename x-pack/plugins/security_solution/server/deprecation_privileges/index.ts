/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DeprecationsDetails, DeprecationsServiceSetup } from '../../../../../src/core/server';
import type { PrivilegeDeprecationsServices } from '../../../security/common/model';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../common/constants';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  getKibanaRolesByFeatureId?: PrivilegeDeprecationsServices['getKibanaRolesByFeatureId'];
}

export const updateSecuritySolutionPrivileges = (
  siemPrivileges: string[]
): Partial<Record<typeof SERVER_APP_ID | typeof CASES_FEATURE_ID, string[]>> => {
  const newSiemPrivileges = siemPrivileges.reduce<string[]>((acc, priv) => {
    if (!acc.includes('all') && (priv === 'minimal_all' || priv === 'all')) {
      return [...acc, 'all'];
    } else if (!acc.includes('read') && (priv === 'minimal_read' || priv === 'read')) {
      return [...acc, 'read'];
    }
    return acc;
  }, []);

  const casePrivileges =
    siemPrivileges.includes('minimal_read') || siemPrivileges.includes('minimal_all')
      ? siemPrivileges.reduce<string[]>((acc, priv) => {
          if (priv === 'cases_all') {
            return [...acc, 'all'];
          } else if (priv === 'cases_read') {
            return [...acc, 'read'];
          }
          return acc;
        }, [])
      : newSiemPrivileges;

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
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      if (getKibanaRolesByFeatureId) {
        const responseRoles = await getKibanaRolesByFeatureId({
          context,
          featureId: 'siem',
        });

        if (responseRoles.errors && responseRoles.errors.length > 0) {
          return responseRoles.errors;
        }

        const roles = responseRoles.roles ?? [];
        return roles.map<DeprecationsDetails>((role) => {
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
              'xpack.securitySolution.deprecation.casesSubfeaturePrivileges.title',
              {
                defaultMessage: 'Deprecate cases sub-feature privileges in Security',
              }
            ),
            message: i18n.translate(
              'xpack.securitySolution.deprecation.ccasesSubfeaturePrivileges.message',
              {
                defaultMessage:
                  'The "securitySolutions" feature privilege has been populated with siem feature or cases sub feature if existing.',
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
      }
      return [];
    },
  });
};
