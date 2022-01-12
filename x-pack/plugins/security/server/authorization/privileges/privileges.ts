/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type {
  PluginSetupContract as FeaturesPluginSetup,
  KibanaFeature,
} from '../../../../features/server';
import type { SecurityLicense } from '../../../common/licensing';
import type { RawKibanaPrivileges } from '../../../common/model';
import type { Actions } from '../actions';
import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

export function privilegesFactory(
  actions: Actions,
  featuresService: FeaturesPluginSetup,
  licenseService: Pick<SecurityLicense, 'getFeatures' | 'hasAtLeast'>
) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get() {
      const features = featuresService.getKibanaFeatures();
      const { allowSubFeaturePrivileges } = licenseService.getFeatures();
      const { hasAtLeast: licenseHasAtLeast } = licenseService;
      const basePrivilegeFeatures = features.filter(
        (feature) => !feature.excludeFromBasePrivileges
      );

      let allActions: string[] = [];
      let readActions: string[] = [];

      basePrivilegeFeatures.forEach((feature) => {
        for (const { privilegeId, privilege } of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
          predicate: (pId, featurePrivilege) => !featurePrivilege.excludeFromBasePrivileges,
        })) {
          const privilegeActions = featurePrivilegeBuilder.getActions(privilege, feature);
          allActions = [...allActions, ...privilegeActions];
          if (privilegeId === 'read') {
            readActions = [...readActions, ...privilegeActions];
          }
        }
      });

      allActions = uniq(allActions);
      readActions = uniq(readActions);

      const featurePrivileges: Record<string, Record<string, string[]>> = {};
      for (const feature of features) {
        featurePrivileges[feature.id] = {};
        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
        })) {
          featurePrivileges[feature.id][featurePrivilege.privilegeId] = [
            actions.login,
            actions.version,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];
        }

        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: false,
          licenseHasAtLeast,
        })) {
          featurePrivileges[feature.id][`minimal_${featurePrivilege.privilegeId}`] = [
            actions.login,
            actions.version,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];
        }

        if (allowSubFeaturePrivileges && feature.subFeatures?.length > 0) {
          for (const subFeaturePrivilege of featuresService.subFeaturePrivilegeIterator(
            feature,
            licenseHasAtLeast
          )) {
            featurePrivileges[feature.id][subFeaturePrivilege.id] = [
              actions.login,
              actions.version,
              ...uniq(featurePrivilegeBuilder.getActions(subFeaturePrivilege, feature)),
            ];
          }
        }

        if (Object.keys(featurePrivileges[feature.id]).length === 0) {
          delete featurePrivileges[feature.id];
        }
      }
      return {
        features: featurePrivileges,
        global: {
          all: [
            actions.login,
            actions.version,
            actions.api.get('decryptedTelemetry'),
            actions.api.get('features'),
            actions.api.get('taskManager'),
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            actions.ui.get('management', 'kibana', 'spaces'),
            actions.ui.get('catalogue', 'spaces'),
            actions.ui.get('enterpriseSearch', 'all'),
            ...allActions,
          ],
          read: [
            actions.login,
            actions.version,
            actions.api.get('decryptedTelemetry'),
            ...readActions,
          ],
        },
        space: {
          all: [actions.login, actions.version, ...allActions],
          read: [actions.login, actions.version, ...readActions],
        },
        reserved: features.reduce((acc: Record<string, string[]>, feature: KibanaFeature) => {
          if (feature.reserved) {
            feature.reserved.privileges.forEach((reservedPrivilege) => {
              acc[reservedPrivilege.id] = [
                actions.version,
                ...uniq(featurePrivilegeBuilder.getActions(reservedPrivilege.privilege, feature)),
              ];
            });
          }
          return acc;
        }, {}),
      };
    },
  };
}
