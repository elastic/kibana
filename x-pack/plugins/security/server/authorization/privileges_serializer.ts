/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges } from '../../common/model';
import { PrivilegeSerializer } from './privilege_serializer';

interface SerializedPrivilege {
  application: string;
  name: string;
  actions: string[];
  metadata: Record<string, any>;
}

interface SerializedApplicationPrivileges {
  [key: string]: SerializedPrivilege;
}

interface SerializedPrivileges {
  [key: string]: SerializedApplicationPrivileges;
}

export const serializePrivileges = (
  application: string,
  privilegeMap: RawKibanaPrivileges
): SerializedPrivileges => {
  return {
    [application]: {
      ...Object.entries(privilegeMap.global).reduce((acc, [privilegeName, privilegeActions]) => {
        const name = PrivilegeSerializer.serializeGlobalBasePrivilege(privilegeName);
        acc[name] = {
          application,
          name: privilegeName,
          actions: privilegeActions,
          metadata: {},
        };
        return acc;
      }, {} as Record<string, any>),
      ...Object.entries(privilegeMap.space).reduce((acc, [privilegeName, privilegeActions]) => {
        const name = PrivilegeSerializer.serializeSpaceBasePrivilege(privilegeName);
        acc[name] = {
          application,
          name,
          actions: privilegeActions,
          metadata: {},
        };
        return acc;
      }, {} as Record<string, any>),
      ...Object.entries(privilegeMap.features).reduce((acc, [featureName, featurePrivileges]) => {
        Object.entries(featurePrivileges).forEach(([privilegeName, privilegeActions]) => {
          const name = PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilegeName);
          if (Object.keys(acc).includes(name)) {
            throw new Error(`Detected duplicate feature privilege name: ${name}`);
          }
          acc[name] = {
            application,
            name,
            actions: privilegeActions,
            metadata: {},
          };
        });

        return acc;
      }, {} as Record<string, any>),
      ...Object.entries(privilegeMap.reserved).reduce((acc, [privilegeName, privilegeActions]) => {
        const name = PrivilegeSerializer.serializeReservedPrivilege(privilegeName);
        acc[name] = {
          application,
          name,
          actions: privilegeActions,
          metadata: {},
        };
        return acc;
      }, {} as Record<string, any>),
    },
  };
};
