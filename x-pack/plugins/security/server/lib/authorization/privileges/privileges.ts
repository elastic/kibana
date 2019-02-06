/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues, uniq } from 'lodash';
import {
  RawKibanaFeaturePrivileges,
  RawKibanaPrivileges,
} from 'x-pack/plugins/security/common/model';
import { Feature } from '../../../../../xpack_main/types';
import { Actions } from '../actions';
import { featurePrivilegeBuildersFactory } from './feature_privilege_builder';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

interface XPackMainPlugin {
  getFeatures(): Feature[];
}

export function privilegesFactory(actions: Actions, xpackMainPlugin: XPackMainPlugin) {
  const featurePrivilegeBuilders = featurePrivilegeBuildersFactory(actions);

  return {
    get() {
      const features = xpackMainPlugin.getFeatures();

      const allActions = uniq(
        flatten(
          features.map(feature =>
            Object.values(feature.privileges).reduce<string[]>((acc, privilege) => {
              return [
                ...acc,
                ...flatten(
                  featurePrivilegeBuilders.map(featurePrivilegeBuilder =>
                    featurePrivilegeBuilder.getActions(privilege, feature)
                  )
                ),
              ];
            }, [])
          )
        )
      );

      const readActions = uniq(
        flatten(
          features.map(feature =>
            Object.entries(feature.privileges).reduce<string[]>((acc, [privilegeId, privilege]) => {
              if (privilegeId !== 'read' && !Boolean(privilege.grantWithBaseRead)) {
                return acc;
              }

              return [
                ...acc,
                ...flatten(
                  featurePrivilegeBuilders.map(featurePrivilegeBuilder =>
                    featurePrivilegeBuilder.getActions(privilege, feature)
                  )
                ),
              ];
            }, [])
          )
        )
      );

      return {
        features: features.reduce((acc: RawKibanaFeaturePrivileges, feature: Feature) => {
          acc[feature.id] = mapValues(feature.privileges, privilege => [
            actions.login,
            actions.version,
            ...flatten(
              featurePrivilegeBuilders.map(featurePrivilegeBuilder =>
                featurePrivilegeBuilder.getActions(privilege, feature)
              )
            ),
          ]);
          return acc;
        }, {}),
        global: {
          all: [
            actions.login,
            actions.version,
            actions.space.manage,
            actions.ui.get('spaces', 'manage'),
            ...allActions,
          ],
          read: [actions.login, actions.version, ...readActions],
        },
        space: {
          all: [actions.login, actions.version, ...allActions],
          read: [actions.login, actions.version, ...readActions],
        },
      };
    },
  };
}
