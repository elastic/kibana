/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import { Feature } from '../../../../features/server';
import { RawKibanaPrivileges } from '../../../common/model';
import { Actions } from '../actions';
import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';
import { FeaturesService } from '../../plugin';
import {
  featurePrivilegeIterator,
  subFeaturePrivilegeIterator,
} from './feature_privilege_iterator';

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
          basePrivilegeFeatures.map(feature => {
            const featureActions = [];
            for (const { privilege } of featurePrivilegeIterator(feature, {
              augmentWithSubFeaturePrivileges: true,
              predicate: (privilegeId, featurePrivilege) =>
                !featurePrivilege.excludeFromBasePrivileges,
            })) {
              featureActions.push(...featurePrivilegeBuilder.getActions(privilege, feature));
            }
            return featureActions;
          })
        )
      );

      const readActions = uniq(
        flatten(
          basePrivilegeFeatures.map(feature => {
            const featureActions = [];
            for (const { privilege } of featurePrivilegeIterator(feature, {
              augmentWithSubFeaturePrivileges: true,
              predicate: (privilegeId, featurePrivilege) =>
                !featurePrivilege.excludeFromBasePrivileges && privilegeId === 'read',
            })) {
              featureActions.push(...featurePrivilegeBuilder.getActions(privilege, feature));
            }
            return featureActions;
          })
        )
      );

      const featurePrivileges: Record<string, Record<string, string[]>> = {};
      for (const feature of features) {
        featurePrivileges[feature.id] = {};
        for (const featurePrivilege of featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
        })) {
          featurePrivileges[feature.id][featurePrivilege.privilegeId] = [
            actions.login,
            actions.version,
            ...featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature),
          ];
        }

        for (const featurePrivilege of featurePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: false,
        })) {
          featurePrivileges[feature.id][`minimal_${featurePrivilege.privilegeId}`] = [
            actions.login,
            actions.version,
            ...featurePrivilegeBuilder.getActions(featurePrivilege.privilege, feature),
          ];
        }

        for (const subFeaturePrivilege of subFeaturePrivilegeIterator(feature)) {
          featurePrivileges[feature.id][subFeaturePrivilege.id] = [
            actions.login,
            actions.version,
            ...featurePrivilegeBuilder.getActions(subFeaturePrivilege, feature),
          ];
        }
      }

      return {
        features: featurePrivileges,
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
