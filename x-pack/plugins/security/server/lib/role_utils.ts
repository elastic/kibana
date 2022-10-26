/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/server';

import { ALL_SPACES_ID, GLOBAL_RESOURCE } from '../../common/constants';
import { PrivilegeSerializer } from '../authorization/privilege_serializer';
import { ResourceSerializer } from '../authorization/resource_serializer';
import type { KibanaPrivilegesType } from './role_schema';

export const transformPrivilegesToElasticsearchPrivileges = (
  application: string,
  kibanaPrivileges: KibanaPrivilegesType = []
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

export const validateKibanaPrivileges = (
  kibanaFeatures: KibanaFeature[],
  kibanaPrivileges: KibanaPrivilegesType = []
) => {
  const validationErrors = kibanaPrivileges.flatMap((priv) => {
    const forAllSpaces = priv.spaces.includes(ALL_SPACES_ID);

    return Object.entries(priv.feature ?? {}).flatMap(([featureId, feature]) => {
      const errors: string[] = [];
      const kibanaFeature = kibanaFeatures.find((f) => f.id === featureId);
      if (!kibanaFeature) return errors;

      if (feature.includes('all')) {
        if (kibanaFeature.privileges?.all.disabled) {
          errors.push(`Feature [${featureId}] does not support privilege [all].`);
        }

        if (kibanaFeature.privileges?.all.requireAllSpaces && !forAllSpaces) {
          errors.push(
            `Feature privilege [${featureId}.all] requires all spaces to be selected but received [${priv.spaces.join(
              ','
            )}]`
          );
        }
      }

      if (feature.includes('read')) {
        if (kibanaFeature.privileges?.read.disabled) {
          errors.push(`Feature [${featureId}] does not support privilege [read].`);
        }

        if (kibanaFeature.privileges?.read.requireAllSpaces && !forAllSpaces) {
          errors.push(
            `Feature privilege [${featureId}.read] requires all spaces to be selected but received [${priv.spaces.join(
              ','
            )}]`
          );
        }
      }

      kibanaFeature.subFeatures.forEach((subFeature) => {
        if (
          subFeature.requireAllSpaces &&
          !forAllSpaces &&
          subFeature.privilegeGroups.some((group) =>
            group.privileges.some((privilege) => feature.includes(privilege.id))
          )
        ) {
          errors.push(
            `Sub-feature privilege [${kibanaFeature.name} - ${
              subFeature.name
            }] requires all spaces to be selected but received [${priv.spaces.join(',')}]`
          );
        }
      });

      return errors;
    });
  });

  return { validationErrors };
};
