/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import {
  RawKibanaFeaturePrivileges,
  RawKibanaPrivileges,
  SecuredFeature,
} from '../../../common/model';
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
      const features = featuresService
        .getFeatures()
        .map(feature => new SecuredFeature(feature.toRaw()));
      const basePrivilegeFeatures = features.filter(feature => !feature.excludeFromBasePrivileges);

      const allActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature => {
            const featurePrivilegeActions = [];
            for (const featurePrivilege of feature.privilegeIterator({
              augmentWithSubFeaturePrivileges: true,
              predicate: (id, privilege) => !privilege.excludeFromBasePrivileges,
            })) {
              featurePrivilegeActions.push(
                ...featurePrivilegeBuilder.getActions(featurePrivilege, feature)
              );
            }
            return featurePrivilegeActions;
          })
        )
      );

      const readActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature => {
            const featurePrivilegeActions = [];
            for (const featurePrivilege of feature.privilegeIterator({
              augmentWithSubFeaturePrivileges: true,
              predicate: privilege =>
                privilege.id === 'read' && !privilege.excludeFromBasePrivileges,
            })) {
              featurePrivilegeActions.push(
                ...featurePrivilegeBuilder.getActions(featurePrivilege, feature)
              );
            }
            return featurePrivilegeActions;
          })
        )
      );

      return {
        features: features.reduce((acc: RawKibanaFeaturePrivileges, feature: SecuredFeature) => {
          for (const featurePrivilege of feature.privilegeIterator({
            augmentWithSubFeaturePrivileges: false,
          })) {
            // TODO :(
            acc[feature.id] = {
              ...acc[feature.id],
              [`minimal_${featurePrivilege.id}`]: [
                actions.login,
                actions.version,
                ...featurePrivilegeBuilder.getActions(featurePrivilege, feature),
                ...(featurePrivilege.id === 'all' ? [actions.allHack] : []),
              ],
            };
          }
          for (const featurePrivilege of feature.privilegeIterator({
            augmentWithSubFeaturePrivileges: true,
          })) {
            acc[feature.id] = {
              ...acc[feature.id],
              [featurePrivilege.id]: [
                actions.login,
                actions.version,
                ...featurePrivilegeBuilder.getActions(featurePrivilege, feature),
                ...(featurePrivilege.id === 'all' ? [actions.allHack] : []),
              ],
            };
          }
          for (const subFeaturePrivilege of feature.subFeaturePrivilegeIterator()) {
            acc[feature.id] = {
              ...acc[feature.id],
              [subFeaturePrivilege.id]: [
                actions.login,
                actions.version,
                ...featurePrivilegeBuilder.getActions(subFeaturePrivilege, feature),
              ],
            };
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
        reserved: features.reduce((acc: Record<string, string[]>, feature: SecuredFeature) => {
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
