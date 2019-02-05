/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges } from 'x-pack/plugins/security/common/model';
import { Feature } from '../../../../../xpack_main/types';
import { Actions } from '../actions';
import { FeaturesPrivilegesBuilder } from './features_privileges_builder';

export interface PrivilegesService {
  get(): RawKibanaPrivileges;
}

interface XPackMainPlugin {
  getFeatures(): Feature[];
}

export function privilegesFactory(actions: Actions, xpackMainPlugin: XPackMainPlugin) {
  return {
    get() {
      const features = xpackMainPlugin.getFeatures();
      const featuresPrivilegesBuilder = new FeaturesPrivilegesBuilder(actions);

      return {
        features: featuresPrivilegesBuilder.buildFeaturesPrivileges(features),
        global: {
          all: [
            actions.login,
            actions.version,
            actions.space.manage,
            ...featuresPrivilegesBuilder.getAllActions(features),
          ],
          read: [
            actions.login,
            actions.version,
            ...featuresPrivilegesBuilder.getReadActions(features),
          ],
        },
        space: {
          all: [
            actions.login,
            actions.version,
            ...featuresPrivilegesBuilder.getAllActions(features),
          ],
          read: [
            actions.login,
            actions.version,
            ...featuresPrivilegesBuilder.getReadActions(features),
          ],
        },
      };
    },
  };
}
