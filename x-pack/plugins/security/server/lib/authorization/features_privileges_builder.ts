/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { Dictionary, flatten, mapValues } from 'lodash';
import { FeaturePrivilegeDefinition } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
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
    const allApiReadActions = flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges) {
          return [];
        }

        const apiPrivileges = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...(privilege.api || [])];
            }
            return acc;
          },
          []
        );

        return apiPrivileges.map(api => this.actions.api.get(api));
      })
    );

    return _.uniq(allApiReadActions);
  }

  public getUIFeaturesReadActions(features: Feature[]): string[] {
    const allUIReadActions = flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges) {
          return [];
        }

        const readPrivileges = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...(privilege.ui || [])];
            }
            return acc;
          },
          []
        );

        return readPrivileges.map(uiCapability => this.actions.ui.get(feature.id, uiCapability));
      })
    );

    return _.uniq(allUIReadActions);
  }

  public getUICatalogueReadActions(features: Feature[]): string[] {
    const allCatalogueReadActions = flatten(
      features.map(feature => {
        const { privileges = {}, catalogue: featureCatalogueEntries } = feature;

        const catalogueReadActions = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              const catalogueEntries = privilege.catalogue || featureCatalogueEntries;
              return [...acc, ...this.buildCatalogueFeaturePrivileges(catalogueEntries)];
            }
            return acc;
          },
          []
        );

        return catalogueReadActions;
      })
    );

    return _.uniq(allCatalogueReadActions);
  }

  public getUIManagementReadActions(features: Feature[]): string[] {
    const allManagementReadActions = flatten(
      features.map(feature => {
        const { privileges = {}, management: featureManagementSections } = feature;

        const managementReadActions = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              const managementSections = privilege.management || featureManagementSections;
              return [...acc, ...this.buildManagementFeaturePrivileges(managementSections)];
            }
            return acc;
          },
          []
        );

        return managementReadActions;
      })
    );

    return _.uniq(allManagementReadActions);
  }

  private includeInBaseRead(privilegeId: string, privilege: FeaturePrivilegeDefinition): boolean {
    return privilegeId === 'read' || Boolean(privilege.grantWithBaseRead);
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
      ...this.buildCatalogueFeaturePrivileges(privilegeDefinition.catalogue),
      ...this.buildManagementFeaturePrivileges(privilegeDefinition.management),
    ]);
  }

  private buildCatalogueFeaturePrivileges(catalogueEntries?: string[]): string[] {
    if (!catalogueEntries) {
      return [];
    }

    return catalogueEntries.map(catalogueEntryId =>
      this.actions.ui.get('catalogue', catalogueEntryId)
    );
  }

  private buildManagementFeaturePrivileges(managementSections?: {
    [managementSectionId: string]: string[];
  }): string[] {
    if (!managementSections) {
      return [];
    }

    return Object.entries(managementSections).reduce(
      (acc, [sectionId, items]) => {
        return [...acc, ...items.map(item => this.actions.ui.get('management', sectionId, item))];
      },
      [] as string[]
    );
  }
}
