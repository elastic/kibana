/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, mapValues, uniq } from 'lodash';
import { FeatureKibanaPrivileges } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';
import { RawKibanaFeaturePrivileges } from 'x-pack/plugins/security/common/model';

interface FeatureDerivedPrivileges
{
  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[]
}

class FeatureDerivedAPIPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) { }

  getActions(privilegeDefinition: FeatureKibanaPrivileges) : string[] {
    if (privilegeDefinition.api) {
      return privilegeDefinition.api.map(operation => this.actions.api.get(operation));
    }

    return [];
  }
}

class FeatureDerivedAppPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) { }

  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) : string[] {
    const appIds = privilegeDefinition.app || feature.app;

    if (!appIds) {
      return [];
    }

    return appIds.map(appId => this.actions.app.get(appId));
  }
}

class FeatureDerivedSavedObjectPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) { }

  getActions(privilegeDefinition: FeatureKibanaPrivileges) : string[] {
    return [
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
    ];
  }
}

class FeatureDerivedUIPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) { }

  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) : string[] {
    return privilegeDefinition.ui.map(ui => this.actions.ui.get(feature.id, ui));
  }
}

class FeatureDerivedNavlinkPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
    return (feature.navLinkId ? [this.actions.ui.get('navLinks', feature.navLinkId)] : []);
  }
}

class FeatureDerivedCataloguePrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
    const catalogueEntries = privilegeDefinition.catalogue || feature.catalogue;

    if (!catalogueEntries) {
      return [];
    }

    return catalogueEntries.map(catalogueEntryId =>
      this.actions.ui.get('catalogue', catalogueEntryId)
    );
  }
}

class FeatureDerivedManagementPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
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

export class FeaturesPrivilegesBuilder {
  private actions: Actions;
  private api: FeatureDerivedPrivileges;
  private app: FeatureDerivedPrivileges;
  private savedObject: FeatureDerivedPrivileges;
  private ui: FeatureDerivedPrivileges;
  private navLink: FeatureDerivedPrivileges;
  private catalogue: FeatureDerivedPrivileges;
  private management: FeatureDerivedPrivileges;

  constructor(actions: Actions) {
    this.actions = actions;
    this.api = new FeatureDerivedAPIPrivileges(this.actions);
    this.app = new FeatureDerivedAppPrivileges(this.actions);
    this.savedObject = new FeatureDerivedSavedObjectPrivileges(this.actions);
    this.ui = new FeatureDerivedUIPrivileges(this.actions);
    this.navLink = new FeatureDerivedNavlinkPrivileges(this.actions);
    this.catalogue = new FeatureDerivedCataloguePrivileges(this.actions);
    this.management = new FeatureDerivedManagementPrivileges(this.actions);
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
              return [...acc, ...this.catalogue.getActions(privilege, feature)];
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
              return [...acc, ...this.management.getActions(privilege, feature)];
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
    const featureDerivedPrivilegesCollection = [
      this.api,
      this.app,
      this.savedObject,
      this.ui,
      this.navLink,
      this.catalogue,
      this.management,
    ];

    return mapValues(feature.privileges, privilegeDefinition => [
      this.actions.login,
      this.actions.version,
      ...flatten(featureDerivedPrivilegesCollection.map(
        featureDerivedPrivileges => featureDerivedPrivileges.getActions(privilegeDefinition, feature))
      )
    ]);
  }
}
