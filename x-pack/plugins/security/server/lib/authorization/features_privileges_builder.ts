/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, mapValues, uniq } from 'lodash';
import { FeatureKibanaPrivileges } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { Feature } from '../../../../xpack_main/types';
import { RawKibanaFeaturePrivileges } from '../../../common/model';
import { Actions } from './actions';

export class FeaturesPrivilegesBuilder {
  private actions: Actions;

  constructor(actions: Actions) {
    this.actions = actions;
  }

  public buildFeaturesPrivileges(features: Feature[]): RawKibanaFeaturePrivileges {
    return features.reduce((acc: RawKibanaFeaturePrivileges, feature: Feature) => {
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

        const apiOperations = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...(privilege.api || [])];
            }
            return acc;
          },
          []
        );

        return apiOperations.map(api => this.actions.api.get(api));
      })
    );

    return uniq(allApiReadActions);
  }

  public getUIFeaturesReadActions(features: Feature[]): string[] {
    const allUIReadActions = flatten(
      features.map(feature => {
        const { privileges } = feature;
        if (!privileges) {
          return [];
        }

        const readUICapabilities = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...(privilege.ui || [])];
            }
            return acc;
          },
          []
        );

        return readUICapabilities.map(uiCapability =>
          this.actions.ui.get(feature.id, uiCapability)
        );
      })
    );

    return uniq(allUIReadActions);
  }

  public getUICatalogueReadActions(features: Feature[]): string[] {
    const allCatalogueReadActions = flatten(
      features.map(feature => {
        const { privileges = {} } = feature;

        const catalogueReadActions = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...this.buildCatalogueFeaturePrivileges(privilege, feature)];
            }
            return acc;
          },
          []
        );

        return catalogueReadActions;
      })
    );

    return uniq(allCatalogueReadActions);
  }

  public getUIManagementReadActions(features: Feature[]): string[] {
    const allManagementReadActions = flatten(
      features.map(feature => {
        const { privileges = {} } = feature;

        const managementReadActions = Object.entries(privileges).reduce<string[]>(
          (acc, [privilegeId, privilege]) => {
            if (this.includeInBaseRead(privilegeId, privilege)) {
              return [...acc, ...this.buildManagementFeaturePrivileges(privilege, feature)];
            }
            return acc;
          },
          []
        );

        return managementReadActions;
      })
    );

    return uniq(allManagementReadActions);
  }

  private includeInBaseRead(privilegeId: string, privilege: FeatureKibanaPrivileges): boolean {
    return privilegeId === 'read' || Boolean(privilege.grantWithBaseRead);
  }

  private buildFeaturePrivileges(feature: Feature): Record<string, string[]> {
    return mapValues(feature.privileges, privilegeDefinition => [
      this.actions.login,
      this.actions.version,
      ...(privilegeDefinition.api
        ? privilegeDefinition.api.map(api => this.actions.api.get(api))
        : []),
      ...this.buildAppFeaturePrivileges(privilegeDefinition, feature),
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
      // Entries on the privilege definition take priority over entries on the feature.
      ...this.buildCatalogueFeaturePrivileges(privilegeDefinition, feature),
      ...this.buildManagementFeaturePrivileges(privilegeDefinition, feature),
    ]);
  }

  private buildAppFeaturePrivileges(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: Feature
  ): string[] {
    const appEntries = privilegeDefinition.app || feature.app;

    if (!appEntries) {
      return [];
    }

    return appEntries.map(appId => this.actions.app.get(appId));
  }

  private buildCatalogueFeaturePrivileges(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: Feature
  ): string[] {
    const catalogueEntries = privilegeDefinition.catalogue || feature.catalogue;

    if (!catalogueEntries) {
      return [];
    }

    return catalogueEntries.map(catalogueEntryId =>
      this.actions.ui.get('catalogue', catalogueEntryId)
    );
  }

  private buildManagementFeaturePrivileges(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: Feature
  ): string[] {
    const managementSections = privilegeDefinition.management || feature.management;

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
