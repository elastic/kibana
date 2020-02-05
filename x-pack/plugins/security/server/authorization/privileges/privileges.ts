/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues, uniq } from 'lodash';
import { Feature } from '../../../../features/server';
import { RawKibanaFeaturePrivileges, RawKibanaPrivileges } from '../../../common/model';
import { Actions } from '../actions';
import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';
import { FeaturesService } from '../../plugin';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

export function privilegesFactory(actions: Actions, featuresService: FeaturesService) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get() {
      const features = featuresService.getFeatures();
      const basePrivilegeFeatures = features.filter(feature => !feature.excludeFromBasePrivileges);

      const allActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature =>
            Object.values(feature.privileges).reduce<string[]>((acc, privilege) => {
              if (privilege.excludeFromBasePrivileges) {
                return acc;
              }

              return [...acc, ...featurePrivilegeBuilder.getActions(privilege, feature)];
            }, [])
          )
        )
      );

      const readActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature =>
            Object.entries(feature.privileges).reduce<string[]>((acc, [privilegeId, privilege]) => {
              if (privilegeId !== 'read' || privilege.excludeFromBasePrivileges) {
                return acc;
              }

              return [...acc, ...featurePrivilegeBuilder.getActions(privilege, feature)];
            }, [])
          )
        )
      );

      return {
        features: features.reduce((acc: RawKibanaFeaturePrivileges, feature: Feature) => {
          if (Object.keys(feature.privileges).length > 0) {
            acc[feature.id] = mapValues(feature.privileges, (privilege, privilegeId) => [
              actions.login,
              actions.version,
              ...featurePrivilegeBuilder.getActions(privilege, feature),
              ...(privilegeId === 'all' ? [actions.allHack] : []),
            ]);
          }
          return acc;
        }, {}),
        global: {
          all: [
            actions.login,
            actions.version,
            actions.api.get('features'),
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            actions.ui.get('management', 'kibana', 'spaces'),
            ...allActions,
            actions.allHack,
          ],
          read: [actions.login, actions.version, ...readActions],
        },
        space: {
          all: [actions.login, actions.version, ...allActions, actions.allHack],
          read: [actions.login, actions.version, ...readActions],
        },
        reserved: features.reduce((acc: Record<string, string[]>, feature: Feature) => {
          if (feature.reserved) {
            acc[feature.id] = [
              actions.version,
              ...featurePrivilegeBuilder.getActions(feature.reserved!.privilege, feature),
            ];
          }
          return acc;
        }, {}),
      };
    },
  };
}
