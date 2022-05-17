/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GLOBAL_RESOURCE } from '../../common/constants';
import { PrivilegeSerializer } from '../authorization/privilege_serializer';
import { ResourceSerializer } from '../authorization/resource_serializer';
import type { KibanaPrivileges } from '../routes/authorization/roles/model/put_payload';

export const transformPrivilegesToElasticsearchPrivileges = (
  application: string,
  kibanaPrivileges: KibanaPrivileges = []
) => {
  return kibanaPrivileges.map(({ base, feature, spaces }) => {
    if (spaces.length === 1 && spaces[0] === GLOBAL_RESOURCE) {
      return {
        privileges: [
          ...(base
            ? base.map((privilege) => PrivilegeSerializer.serializeGlobalBasePrivilege(privilege))
            : []),
          ...(feature
            ? Object.entries(feature)
                .map(([featureName, featurePrivileges]) =>
                  featurePrivileges.map((privilege) =>
                    PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                  )
                )
                .flat()
            : []),
        ],
        application,
        resources: [GLOBAL_RESOURCE],
      };
    }

    return {
      privileges: [
        ...(base
          ? base.map((privilege) => PrivilegeSerializer.serializeSpaceBasePrivilege(privilege))
          : []),
        ...(feature
          ? Object.entries(feature)
              .map(([featureName, featurePrivileges]) =>
                featurePrivileges.map((privilege) =>
                  PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                )
              )
              .flat()
          : []),
      ],
      application,
      resources: (spaces as string[]).map((resource) =>
        ResourceSerializer.serializeSpaceResource(resource)
      ),
    };
  });
};
