/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues, uniq } from 'lodash';
import { Feature } from '../../../../../xpack_main/types';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { RawKibanaFeaturePrivileges, RawKibanaPrivileges } from '../../../../common/model';
import { Actions } from '../actions';
import { featurePrivilegeBuilderFactory } from './feature_privilege_builder';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

export function privilegesFactory(actions: Actions, xpackMainPlugin: XPackMainPlugin) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);

  return {
    get() {
      const features = xpackMainPlugin.getFeatures();

      const allActions = uniq(
        flatten(
          features.map(feature =>
            Object.values(feature.privileges).reduce<string[]>((acc, privilege) => {
              return [...acc, ...featurePrivilegeBuilder.getActions(privilege, feature)];
            }, [])
          )
        )
      );

      const readActions = uniq(
        flatten(
          features.map(feature =>
            Object.entries(feature.privileges).reduce<string[]>((acc, [privilegeId, privilege]) => {
              if (privilegeId !== 'read') {
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
