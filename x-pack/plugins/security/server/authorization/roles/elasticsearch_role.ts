/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/common';
import type { SubFeaturePrivilegeIterator } from '@kbn/features-plugin/server';
import { getReplacedByForPrivilege } from '@kbn/security-authorization-core';
import { getMinimalPrivilegeId } from '@kbn/security-authorization-core-common';
import { GLOBAL_RESOURCE } from '@kbn/security-plugin-types-server';

import type { FeaturesPrivileges, Role } from '../../../common';
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
const isWildcardPrivilege = (app: string) => app === PRIVILEGES_ALL_WILDCARD;

export interface TransformRoleOptions {
  features: KibanaFeature[];
  elasticsearchRole: Omit<ElasticsearchRole, 'name'>;
  name: string;
  application: string;
  logger: Logger;
  subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
  replaceDeprecatedKibanaPrivileges?: boolean;
}

export function transformElasticsearchRoleToRole({
  features,
  elasticsearchRole,
  name,
  application,
  logger,
  subFeaturePrivilegeIterator,
  replaceDeprecatedKibanaPrivileges,
}: TransformRoleOptions): Role {
  const kibanaTransformResult = transformRoleApplicationsToKibanaPrivileges({
    features,
    roleApplications: elasticsearchRole.applications,
    application,
    logger,
    subFeaturePrivilegeIterator,
    replaceDeprecatedKibanaPrivileges,
  });
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

interface TransformRoleApplicationsOptions {
  features: KibanaFeature[];
  roleApplications: ElasticsearchRole['applications'];
  application: string;
  logger: Logger;
  subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
  replaceDeprecatedKibanaPrivileges?: boolean;
}

function transformRoleApplicationsToKibanaPrivileges({
  features,
  roleApplications,
  application,
  logger,
  subFeaturePrivilegeIterator,
  replaceDeprecatedKibanaPrivileges,
}: TransformRoleApplicationsOptions) {
  const roleKibanaApplications = roleApplications.filter(
    (roleApplication) =>
      roleApplication.application === application ||
      isReservedPrivilege(roleApplication.application) ||
      isWildcardPrivilege(roleApplication.application)
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
        (isReservedPrivilege(entry.application) || isWildcardPrivilege(entry.application)) &&
        !entry.privileges.every(
          (privilege) =>
            PrivilegeSerializer.isSerializedReservedPrivilege(privilege) ||
            isWildcardPrivilege(privilege)
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
        !isWildcardPrivilege(entry.application) &&
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
      (entry) => !isReservedPrivilege(entry.application) && !isWildcardPrivilege(entry.application)
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
      const featurePrivileges = deserializeKibanaFeaturePrivileges({
        features,
        subFeaturePrivilegeIterator,
        serializedPrivileges: privileges,
        replaceDeprecatedKibanaPrivileges,
      });

      // if we're dealing with a global entry, which we've ensured above is only possible if it's the only item in the array
      if (resources.length === 1 && resources[0] === GLOBAL_RESOURCE) {
        const reservedPrivileges = privileges.filter((privilege) =>
          PrivilegeSerializer.isSerializedReservedPrivilege(privilege)
        );
        const basePrivileges = privileges.filter((privilege) =>
          PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)
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
          feature: featurePrivileges,
          spaces: ['*'],
        };
      }

      const basePrivileges = privileges.filter((privilege) =>
        PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)
      );
      return {
        base: basePrivileges.map((privilege) =>
          PrivilegeSerializer.deserializeSpaceBasePrivilege(privilege)
        ),
        feature: featurePrivileges,
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
          !isWildcardPrivilege(roleApplication.application)
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

interface DeserializeFeaturePrivilegesOptions {
  features: KibanaFeature[];
  serializedPrivileges: string[];
  subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
  replaceDeprecatedKibanaPrivileges?: boolean;
}

function deserializeKibanaFeaturePrivileges({
  features,
  subFeaturePrivilegeIterator,
  serializedPrivileges,
  replaceDeprecatedKibanaPrivileges,
}: DeserializeFeaturePrivilegesOptions) {
  // Filter out deprecated features upfront to avoid going through ALL features within a loop.
  const deprecatedFeatures = replaceDeprecatedKibanaPrivileges
    ? features.filter((feature) => feature.deprecated)
    : undefined;
  const result = {} as FeaturesPrivileges;
  for (const serializedPrivilege of serializedPrivileges) {
    if (!PrivilegeSerializer.isSerializedFeaturePrivilege(serializedPrivilege)) {
      continue;
    }

    const { featureId, privilege: privilegeId } =
      PrivilegeSerializer.deserializeFeaturePrivilege(serializedPrivilege);

    // If feature privileges are deprecated, replace them with non-deprecated feature privileges according to the
    // deprecation "mapping".
    const deprecatedFeature = deprecatedFeatures?.find((feature) => feature.id === featureId);
    if (deprecatedFeature) {
      const privilege = getPrivilegeById(
        deprecatedFeature,
        privilegeId,
        subFeaturePrivilegeIterator
      );

      const replacedBy = privilege ? getReplacedByForPrivilege(privilegeId, privilege) : undefined;
      if (!replacedBy) {
        throw new Error(
          `A deprecated feature "${featureId}" is missing a replacement for the "${privilegeId}" privilege.`
        );
      }

      for (const reference of replacedBy) {
        result[reference.feature] = getUniqueList([
          ...(result[reference.feature] || []),
          ...reference.privileges,
        ]);
      }
    } else {
      result[featureId] = getUniqueList([...(result[featureId] || []), privilegeId]);
    }
  }

  return result;
}

function getPrivilegeById(
  feature: KibanaFeature,
  privilegeId: string,
  subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator
): FeatureKibanaPrivileges | undefined {
  for (const topLevelPrivilege of ['all' as const, 'read' as const]) {
    if (
      privilegeId === topLevelPrivilege ||
      privilegeId === getMinimalPrivilegeId(topLevelPrivilege)
    ) {
      return feature.privileges?.[topLevelPrivilege];
    }
  }

  // Don't perform license check as it should be done during feature registration (once we support
  // license checks for deprecated privileges).
  for (const subFeaturePrivilege of subFeaturePrivilegeIterator(feature, () => true)) {
    if (subFeaturePrivilege.id === privilegeId) {
      return subFeaturePrivilege;
    }
  }
}
