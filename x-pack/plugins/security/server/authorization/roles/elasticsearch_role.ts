/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { GLOBAL_RESOURCE } from '@kbn/security-plugin-types-server';

import type { Role, RoleKibanaPrivilege } from '../../../common';
import {
  PRIVILEGES_ALL_WILDCARD,
  RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
} from '../../../common/constants';
import { getDetailedErrorMessage } from '../../errors';
import { PrivilegeSerializer } from '../privilege_serializer';
import { ResourceSerializer } from '../resource_serializer';

export type ElasticsearchRole = Pick<
  Role,
  'name' | 'description' | 'metadata' | 'transient_metadata'
> & {
  applications: Array<{
    application: string;
    privileges: string[];
    resources: string[];
  }>;
  cluster: Role['elasticsearch']['cluster'];
  remote_cluster: Role['elasticsearch']['remote_cluster'];
  indices: Role['elasticsearch']['indices'];
  remote_indices?: Role['elasticsearch']['remote_indices'];
  run_as: Role['elasticsearch']['run_as'];
};

const isReservedPrivilege = (app: string) => app === RESERVED_PRIVILEGES_APPLICATION_WILDCARD;
const isWildcardPrivilage = (app: string) => app === PRIVILEGES_ALL_WILDCARD;

export function transformElasticsearchRoleToRole(
  features: KibanaFeature[],
  elasticsearchRole: Omit<ElasticsearchRole, 'name'>,
  name: string,
  application: string,
  logger: Logger
): Role {
  const kibanaTransformResult = transformRoleApplicationsToKibanaPrivileges(
    features,
    elasticsearchRole.applications,
    application,
    logger
  );
  return {
    name,
    ...(elasticsearchRole.description && { description: elasticsearchRole.description }),
    metadata: elasticsearchRole.metadata,
    transient_metadata: elasticsearchRole.transient_metadata,
    elasticsearch: {
      cluster: elasticsearchRole.cluster,
      remote_cluster: elasticsearchRole.remote_cluster,
      indices: elasticsearchRole.indices,
      remote_indices: elasticsearchRole.remote_indices,
      run_as: elasticsearchRole.run_as,
    },
    kibana: kibanaTransformResult.success ? (kibanaTransformResult.value as Role['kibana']) : [],
    _transform_error: [...(kibanaTransformResult.success ? [] : ['kibana'])],
    _unrecognized_applications: extractUnrecognizedApplicationNames(
      elasticsearchRole.applications,
      application
    ),
  };
}

function transformRoleApplicationsToKibanaPrivileges(
  features: KibanaFeature[],
  roleApplications: ElasticsearchRole['applications'],
  application: string,
  logger: Logger
) {
  const roleKibanaApplications = roleApplications.filter(
    (roleApplication) =>
      roleApplication.application === application ||
      isReservedPrivilege(roleApplication.application) ||
      isWildcardPrivilage(roleApplication.application)
  );

  // if any application entry contains an empty resource, we throw an error
  if (roleKibanaApplications.some((entry) => entry.resources.length === 0)) {
    throw new Error(`ES returned an application entry without resources, can't process this`);
  }

  // if there is an entry with the reserved privileges application wildcard
  // and there are privileges which aren't reserved, we won't transform these
  if (
    roleKibanaApplications.some(
      (entry) =>
        (isReservedPrivilege(entry.application) || isWildcardPrivilage(entry.application)) &&
        !entry.privileges.every(
          (privilege) =>
            PrivilegeSerializer.isSerializedReservedPrivilege(privilege) ||
            isWildcardPrivilage(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if there is a reserved privilege assigned to an application other than the reserved privileges application wildcard, we won't transform these.
  if (
    roleKibanaApplications.some(
      (entry) =>
        !isReservedPrivilege(entry.application) &&
        !isWildcardPrivilage(entry.application) &&
        entry.privileges.some((privilege) =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if space privilege assigned globally, we can't transform these
  if (
    roleKibanaApplications.some(
      (entry) =>
        entry.resources.includes(GLOBAL_RESOURCE) &&
        entry.privileges.some((privilege) =>
          PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if global base or reserved privilege assigned at a space, we can't transform these
  if (
    roleKibanaApplications.some(
      (entry) =>
        !entry.resources.includes(GLOBAL_RESOURCE) &&
        entry.privileges.some(
          (privilege) =>
            PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege) ||
            PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if base privilege assigned with feature privileges, we won't transform these
  if (
    roleKibanaApplications.some(
      (entry) =>
        entry.privileges.some((privilege) =>
          PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
        ) &&
        (entry.privileges.some((privilege) =>
          PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)
        ) ||
          entry.privileges.some((privilege) =>
            PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
          ))
    )
  ) {
    return {
      success: false,
    };
  }

  // if any application entry contains the '*' resource in addition to another resource, we can't transform these
  if (
    roleKibanaApplications.some(
      (entry) => entry.resources.includes(GLOBAL_RESOURCE) && entry.resources.length > 1
    )
  ) {
    return {
      success: false,
    };
  }

  const allResources = roleKibanaApplications
    .filter(
      (entry) => !isReservedPrivilege(entry.application) && !isWildcardPrivilage(entry.application)
    )
    .flatMap((entry) => entry.resources);

  // if we have improperly formatted resource entries, we can't transform these
  if (
    allResources.some(
      (resource) =>
        resource !== GLOBAL_RESOURCE && !ResourceSerializer.isSerializedSpaceResource(resource)
    )
  ) {
    return {
      success: false,
    };
  }

  // if we have resources duplicated in entries, we won't transform these
  if (allResources.length !== getUniqueList(allResources).length) {
    return {
      success: false,
    };
  }

  // if a feature privilege requires all spaces, but is assigned to other spaces, we won't transform these
  if (
    roleKibanaApplications.some(
      (entry) =>
        !entry.resources.includes(GLOBAL_RESOURCE) &&
        features.some((f) =>
          Object.entries(f.privileges ?? {}).some(
            ([privName, featurePrivilege]) =>
              featurePrivilege.requireAllSpaces &&
              entry.privileges.includes(
                PrivilegeSerializer.serializeFeaturePrivilege(f.id, privName)
              )
          )
        )
    )
  ) {
    return {
      success: false,
    };
  }

  // if a feature privilege has been disabled we won't transform these
  if (
    roleKibanaApplications.some((entry) =>
      features.some((f) =>
        Object.entries(f.privileges ?? {}).some(
          ([privName, featurePrivilege]) =>
            featurePrivilege.disabled &&
            entry.privileges.includes(PrivilegeSerializer.serializeFeaturePrivilege(f.id, privName))
        )
      )
    )
  ) {
    return {
      success: false,
    };
  }

  // try/catch block ensures graceful return on deserialize exceptions
  try {
    const transformResult = roleKibanaApplications.map(({ resources, privileges }) => {
      // if we're dealing with a global entry, which we've ensured above is only possible if it's the only item in the array
      if (resources.length === 1 && resources[0] === GLOBAL_RESOURCE) {
        const reservedPrivileges = privileges.filter((privilege) =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        );
        const basePrivileges = privileges.filter((privilege) =>
          PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)
        );
        const featurePrivileges = privileges.filter((privilege) =>
          PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
        );

        return {
          ...(reservedPrivileges.length
            ? {
                _reserved: reservedPrivileges.map((privilege) =>
                  PrivilegeSerializer.deserializeReservedPrivilege(privilege)
                ),
              }
            : {}),
          base: basePrivileges.map((privilege) =>
            PrivilegeSerializer.serializeGlobalBasePrivilege(privilege)
          ),
          feature: featurePrivileges.reduce((acc, privilege) => {
            const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
            acc[featurePrivilege.featureId] = getUniqueList([
              ...(acc[featurePrivilege.featureId] || []),
              featurePrivilege.privilege,
            ]);
            return acc;
          }, {} as RoleKibanaPrivilege['feature']),
          spaces: ['*'],
        };
      }

      const basePrivileges = privileges.filter((privilege) =>
        PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
      );
      const featurePrivileges = privileges.filter((privilege) =>
        PrivilegeSerializer.isSerializedFeaturePrivilege(privilege)
      );
      return {
        base: basePrivileges.map((privilege) =>
          PrivilegeSerializer.deserializeSpaceBasePrivilege(privilege)
        ),
        feature: featurePrivileges.reduce((acc, privilege) => {
          const featurePrivilege = PrivilegeSerializer.deserializeFeaturePrivilege(privilege);
          acc[featurePrivilege.featureId] = getUniqueList([
            ...(acc[featurePrivilege.featureId] || []),
            featurePrivilege.privilege,
          ]);
          return acc;
        }, {} as RoleKibanaPrivilege['feature']),
        spaces: resources.map((resource) => ResourceSerializer.deserializeSpaceResource(resource)),
      };
    });

    return {
      success: true,
      value: transformResult,
    };
  } catch (e) {
    logger.error(`Error transforming Elasticsearch role: ${getDetailedErrorMessage(e)}`);
    return {
      success: false,
    };
  }
}

const extractUnrecognizedApplicationNames = (
  roleApplications: ElasticsearchRole['applications'],
  application: string
) => {
  return getUniqueList(
    roleApplications
      .filter(
        (roleApplication) =>
          roleApplication.application !== application &&
          !isReservedPrivilege(roleApplication.application) &&
          !isWildcardPrivilage(roleApplication.application)
      )
      .map((roleApplication) => roleApplication.application)
  );
};

function getUniqueList<T>(list: T[]) {
  return Array.from(new Set<T>(list));
}

export const compareRolesByName = (roleA: Role, roleB: Role) => {
  if (roleA.name < roleB.name) {
    return -1;
  }

  if (roleA.name > roleB.name) {
    return 1;
  }

  return 0;
};
