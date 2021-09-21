/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsDetails, DeprecationsServiceSetup } from '../../../../../src/core/server';
import type { PrivilegeDeprecationsServices } from '../../../security/common/model';

interface Deps {
  deprecationsService: DeprecationsServiceSetup;
  getKibanaRolesByFeatureId: PrivilegeDeprecationsServices['getKibanaRolesByFeatureId'];
}

export const registerPrivilegeDeprecations = ({
  deprecationsService,
  getKibanaRolesByFeatureId,
}: Deps) => {
  deprecationsService.registerDeprecations({
    getDeprecations: async (context) => {
      const responseRoles = await getKibanaRolesByFeatureId({
        context,
        featureId: 'siem',
      });

      if (responseRoles.errors && responseRoles.errors.length > 0) {
        return responseRoles.errors;
      }

      return (responseRoles.roles ?? []).map<DeprecationsDetails>((role) => {
        const { metadata, elasticsearch, kibana } = role;

        const updatedKibana = kibana.map((privilege) => {
          const { siem, ...otherFeatures } = privilege.feature;
          const privilegeContainsSiem = Array.isArray(siem) && siem.length > 0;

          if (privilegeContainsSiem) {
            return {
              ...privilege,
              feature: {
                ...otherFeatures,
                // FIXME: do something to transform this into the "new" set of privileges
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
          title: '',
          message: 'The "siem" feature privilege has been replaced with "foo" and "bar".',
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
    },
  });
};
