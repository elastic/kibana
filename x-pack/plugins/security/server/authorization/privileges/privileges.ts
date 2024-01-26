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
} from '@kbn/features-plugin/server';

import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';
import type { SecurityLicense } from '../../../common';
import type { RawKibanaPrivileges } from '../../../common/model';
import type { Actions } from '../actions';

export interface PrivilegesService {
  get(respectLicenseLevel?: boolean): RawKibanaPrivileges;
}

export function privilegesFactory(
  actions: Actions,
  featuresService: FeaturesPluginSetup,
  licenseService: Pick<SecurityLicense, 'getFeatures' | 'hasAtLeast'>
) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get(respectLicenseLevel: boolean = true) {
      const features = featuresService.getKibanaFeatures();
      const { allowSubFeaturePrivileges } = licenseService.getFeatures();
      const { hasAtLeast: licenseHasAtLeast } = licenseService;
      const basePrivilegeFeatures = features.filter(
        (feature) => !feature.excludeFromBasePrivileges
      );

      const allActionsSet = new Set<string>();
      const readActionsSet = new Set<string>();

      basePrivilegeFeatures.forEach((feature) => {
        for (const { privilegeId, privilege } of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
          predicate: (pId, featurePrivilege) => !featurePrivilege.excludeFromBasePrivileges,
        })) {
          const privilegeActions = featurePrivilegeBuilder.getActions(privilege, feature);
          privilegeActions.forEach((action) => {
            allActionsSet.add(action);
            if (privilegeId === 'read') {
              readActionsSet.add(action);
            }
          });
        }
      });

      const allActions = [...allActionsSet];
      const readActions = [...readActionsSet];

      const featurePrivileges: Record<string, Record<string, string[]>> = {};
      for (const feature of features) {
        featurePrivileges[feature.id] = {};
        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseHasAtLeast,
        })) {
          featurePrivileges[feature.id][featurePrivilege.privilegeId] = [
            actions.login,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];
        }

        for (const featurePrivilege of featuresService.featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: false,
          licenseHasAtLeast,
        })) {
          featurePrivileges[feature.id][`minimal_${featurePrivilege.privilegeId}`] = [
            actions.login,
            ...uniq(featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature)),
          ];
        }

        if (
          (!respectLicenseLevel || allowSubFeaturePrivileges) &&
          feature.subFeatures?.length > 0
        ) {
          for (const subFeaturePrivilege of featuresService.subFeaturePrivilegeIterator(
            feature,
            licenseHasAtLeast
          )) {
            featurePrivileges[feature.id][subFeaturePrivilege.id] = [
              actions.login,
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
            actions.api.get('decryptedTelemetry'),
            actions.api.get('features'),
            actions.api.get('taskManager'),
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            actions.ui.get('management', 'kibana', 'spaces'),
            actions.ui.get('catalogue', 'spaces'),
            actions.ui.get('enterpriseSearch', 'all'),
            actions.ui.get('globalSettings', 'save'),
            actions.ui.get('globalSettings', 'show'),
            ...allActions,
          ],
          read: [
            actions.login,
            actions.api.get('decryptedTelemetry'),
            actions.ui.get('globalSettings', 'show'),
            ...readActions,
          ],
        },
        space: {
          all: [actions.login, ...allActions],
          read: [actions.login, ...readActions],
        },
        reserved: features.reduce((acc: Record<string, string[]>, feature: KibanaFeature) => {
          if (feature.reserved) {
            feature.reserved.privileges.forEach((reservedPrivilege) => {
              acc[reservedPrivilege.id] = [
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
