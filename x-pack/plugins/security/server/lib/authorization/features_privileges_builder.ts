/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues } from 'lodash';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';

interface FeaturePrivileges {
  featureId: string;
  privileges: Record<string, string[]>;
}

export type FeaturesPrivileges = Record<string, Record<string, string[]>>;

export class FeaturesPrivilegesBuilder {
  private actions: Actions;

  constructor(actions: Actions) {
    this.actions = actions;
  }

  public build(features: Feature[]): FeaturesPrivileges {
    return features
      .map(feature => this.buildFeaturePrivileges(feature))
      .reduce((acc: FeaturesPrivileges, featurePrivileges) => {
        acc[featurePrivileges.featureId] = featurePrivileges.privileges;
        return acc;
      }, {});
  }

  private buildFeaturePrivileges(feature: Feature): FeaturePrivileges {
    return {
      featureId: feature.id,
      privileges: mapValues(feature.privileges, privilegeDefinition => [
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
        ...privilegeDefinition.ui.map(ui => this.actions.ui.get(ui)),
      ]),
    };
  }
}
