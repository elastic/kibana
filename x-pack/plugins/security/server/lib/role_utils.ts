/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { KibanaPrivilegesType } from '@kbn/security-plugin-types-server';
import { GLOBAL_RESOURCE } from '@kbn/security-plugin-types-server';

import { ALL_SPACES_ID } from '../../common/constants';
import { PrivilegeSerializer } from '../authorization/privilege_serializer';
import { ResourceSerializer } from '../authorization/resource_serializer';

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

    return Object.entries(priv.feature ?? {}).flatMap(([featureId, featurePrivileges]) => {
      const errors: string[] = [];
      const kibanaFeature = kibanaFeatures.find((f) => f.id === featureId && !f.hidden);
      if (!kibanaFeature) return errors;

      if (featurePrivileges.includes('all')) {
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

      if (featurePrivileges.includes('read')) {
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
        // Check if the definition includes any sub-feature privileges.
        const subFeaturePrivileges = subFeature.privilegeGroups.flatMap((group) =>
          group.privileges.filter((privilege) => featurePrivileges.includes(privilege.id))
        );

        // If the definition includes any disabled sub-feature privileges, return an error.
        const disabledSubFeaturePrivileges = subFeaturePrivileges.filter(
          (privilege) => privilege.disabled
        );
        if (disabledSubFeaturePrivileges.length > 0) {
          errors.push(
            `Feature [${featureId}] does not support specified sub-feature privileges [${disabledSubFeaturePrivileges
              .map((privilege) => privilege.id)
              .join(', ')}].`
          );
        } else if (
          subFeature.requireAllSpaces &&
          !forAllSpaces &&
          subFeaturePrivileges.length > 0
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
