/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary, flatten, mapValues } from 'lodash';
import { FeaturesPrivileges } from 'x-pack/plugins/security/common/model';
import { FeaturePrivilegeDefinition } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';

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

  public getUIReadActions(features: Feature[]): string[] {
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

  public getCatalogueReadActions(features: Feature[]): string[] {
    return flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges || !privileges.read || !privileges.read.catalogue) {
          return [];
        }

        return this.buildCatalogueFeaturePrivileges(privileges.read);
      })
    );
  }

  public getManagementReadActions(features: Feature[]): string[] {
    return flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges || !privileges.read || !privileges.read.management) {
          return [];
        }

        return this.buildManagementFeaturePrivileges(privileges.read);
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
      ...this.buildCatalogueFeaturePrivileges(privilegeDefinition),
      ...this.buildManagementFeaturePrivileges(privilegeDefinition),
    ]);
  }

  private buildCatalogueFeaturePrivileges(
    privilegeDefinition: FeaturePrivilegeDefinition
  ): string[] {
    if (!privilegeDefinition.catalogue) {
      return [];
    }

    return privilegeDefinition.catalogue.map(catalogueEntryId =>
      this.actions.ui.get('catalogue', catalogueEntryId)
    );
  }

  private buildManagementFeaturePrivileges(
    privilegeDefinition: FeaturePrivilegeDefinition
  ): string[] {
    if (!privilegeDefinition.management) {
      return [];
    }

    return Object.entries(privilegeDefinition.management).reduce(
      (acc, [sectionId, items]) => {
        return [...acc, ...items.map(item => this.actions.ui.get('management', sectionId, item))];
      },
      [] as string[]
    );
  }
}
