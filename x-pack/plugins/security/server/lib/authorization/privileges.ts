/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeMap } from 'x-pack/plugins/security/common/model';
import { Feature } from '../../../../xpack_main/types';
import { IGNORED_TYPES } from '../../../common/constants';
import { Actions } from './actions';
import { FeaturesPrivilegesBuilder } from './features_privileges_builder';

export interface PrivilegesService {
  get(): PrivilegeMap;
}

interface XPackMainPlugin {
  getFeatures(): Feature[];
}

export function privilegesFactory(
  allSavedObjectTypes: string[],
  actions: Actions,
  xpackMainPlugin: XPackMainPlugin
) {
  return {
    get() {
      // TODO: I'd like to ensure an explicit Error is thrown here if all
      // plugins haven't had a chance to register their features yet
      const features = xpackMainPlugin.getFeatures();
      const validSavedObjectTypes = allSavedObjectTypes.filter(
        type => !IGNORED_TYPES.includes(type)
      );
      const featuresPrivilegesBuilder = new FeaturesPrivilegesBuilder(actions);

      return {
        features: featuresPrivilegesBuilder.buildFeaturesPrivileges(features),
        global: {
          all: [
            actions.login,
            actions.version,
            actions.api.all,
            actions.app.all,
            actions.savedObject.all,
            actions.space.manage,
            actions.ui.all,
          ],
          read: [
            actions.login,
            actions.version,
            ...featuresPrivilegesBuilder.getApiReadActions(features),
            actions.app.all,
            ...actions.savedObject.readOperations(validSavedObjectTypes),
            ...featuresPrivilegesBuilder.getUIFeaturesReadActions(features),
            ...featuresPrivilegesBuilder.getUIManagementReadActions(features),
            ...featuresPrivilegesBuilder.getUICatalogueReadActions(features),
            actions.ui.allNavLinks,
          ],
        },
        space: {
          all: [
            actions.login,
            actions.version,
            actions.api.all,
            actions.app.all,
            ...actions.savedObject.allOperations(validSavedObjectTypes),
            actions.ui.all,
          ],
          read: [
            actions.login,
            actions.version,
            ...featuresPrivilegesBuilder.getApiReadActions(features),
            actions.app.all,
            ...actions.savedObject.readOperations(validSavedObjectTypes),
            ...featuresPrivilegesBuilder.getUIFeaturesReadActions(features),
            ...featuresPrivilegesBuilder.getUIManagementReadActions(features),
            ...featuresPrivilegesBuilder.getUICatalogueReadActions(features),
            actions.ui.allNavLinks,
          ],
        },
      };
    },
  };
}
