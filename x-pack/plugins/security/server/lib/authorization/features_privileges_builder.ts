/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary, flatten, mapValues } from 'lodash';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';

export type FeaturesPrivileges = Record<string, Record<string, string[]>>;

export class FeaturesPrivilegesBuilder {
  private actions: Actions;

  constructor(actions: Actions) {
    this.actions = actions;
  }

  public buildFeaturesPrivileges(features: Feature[]): FeaturesPrivileges {
    return features.reduce((acc: FeaturesPrivileges, feature: Feature) => {
      acc[feature.id] = this.buildFeaturePrivileges(feature);
      return acc;
    }, {});
  }

  public getApiReadActions(features: Feature[]): string[] {
    return flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges || !privileges.read || !privileges.read.api) {
          return [];
        }

        return feature.privileges.read.api!.map(api => this.actions.api.get(api));
      })
    );
  }

  public getUiReadActions(features: Feature[]): string[] {
    return flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges || !privileges.read || !privileges.read.ui) {
          return [];
        }

        return feature.privileges.read.ui!.map(uiCapability =>
          this.actions.ui.get(feature.id, uiCapability)
        );
      })
    );
  }

  private buildFeaturePrivileges(feature: Feature): Dictionary<string[]> {
    return mapValues(feature.privileges, privilegeDefinition => [
      this.actions.login,
      this.actions.version,
      ...(privilegeDefinition.api
        ? privilegeDefinition.api.map(api => this.actions.api.get(api))
        : []),
      ...privilegeDefinition.app.map(appId => this.actions.app.get(appId)),
      ...flatten(
        privilegeDefinition.savedObject.all.map(types =>
          this.actions.savedObject.allOperations(types)
        )
      ),
      ...flatten(
        privilegeDefinition.savedObject.read.map(types =>
          this.actions.savedObject.readOperations(types)
        )
      ),
      ...privilegeDefinition.ui.map(ui => this.actions.ui.get(feature.id, ui)),
      ...(feature.navLinkId ? [this.actions.ui.get('navLinks', feature.navLinkId)] : []),
    ]);
  }
}
