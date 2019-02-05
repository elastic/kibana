/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, mapValues, uniq } from 'lodash';
import { RawKibanaFeaturePrivileges } from 'x-pack/plugins/security/common/model';
import { FeatureKibanaPrivileges } from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { Feature } from '../../../../../xpack_main/types';
import { Actions } from '../actions';

interface FeatureDerivedPrivileges {
  getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[];
}

class FeatureDerivedAPIPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    if (privilegeDefinition.api) {
      return privilegeDefinition.api.map(operation => this.actions.api.get(operation));
    }

    return [];
  }
}

class FeatureDerivedAppPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    const appIds = privilegeDefinition.app || feature.app;

    if (!appIds) {
      return [];
    }

    return appIds.map(appId => this.actions.app.get(appId));
  }
}

class FeatureDerivedSavedObjectPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
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
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    return privilegeDefinition.ui.map(ui => this.actions.ui.get(feature.id, ui));
  }
}

class FeatureDerivedNavlinkPrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
    return feature.navLinkId ? [this.actions.ui.get('navLinks', feature.navLinkId)] : [];
  }
}

class FeatureDerivedCataloguePrivileges implements FeatureDerivedPrivileges {
  constructor(private readonly actions: Actions) {}

  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
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

  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature) {
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
  private featureDerivedPrivilegesCollection: FeatureDerivedPrivileges[];

  constructor(actions: Actions) {
    this.actions = actions;
    this.api = new FeatureDerivedAPIPrivileges(this.actions);
    this.app = new FeatureDerivedAppPrivileges(this.actions);
    this.savedObject = new FeatureDerivedSavedObjectPrivileges(this.actions);
    this.ui = new FeatureDerivedUIPrivileges(this.actions);
    this.navLink = new FeatureDerivedNavlinkPrivileges(this.actions);
    this.catalogue = new FeatureDerivedCataloguePrivileges(this.actions);
    this.management = new FeatureDerivedManagementPrivileges(this.actions);

    this.featureDerivedPrivilegesCollection = [
      this.api,
      this.app,
      this.savedObject,
      this.catalogue,
      this.management,
      this.navLink,
      this.ui,
    ];
  }

  public buildFeaturesPrivileges(features: Feature[]): RawKibanaFeaturePrivileges {
    return features.reduce((acc: RawKibanaFeaturePrivileges, feature: Feature) => {
      acc[feature.id] = this.buildFeaturePrivileges(feature);
      return acc;
    }, {});
  }

  public getAllActions(features: Feature[]): string[] {
    return uniq(
      flatten(
        features.map(feature =>
          Object.values(feature.privileges).reduce<string[]>((acc, privilege) => {
            return [
              ...acc,
              ...flatten(
                this.featureDerivedPrivilegesCollection.map(featureDerivedPrivileges =>
                  featureDerivedPrivileges.getActions(privilege, feature)
                )
              ),
            ];
          }, [])
        )
      )
    );
  }

  public getReadActions(features: Feature[]): string[] {
    return uniq(
      flatten(
        features.map(feature =>
          Object.entries(feature.privileges).reduce<string[]>((acc, [privilegeId, privilege]) => {
            if (!this.includeInBaseRead(privilegeId, privilege)) {
              return acc;
            }

            return [
              ...acc,
              ...flatten(
                this.featureDerivedPrivilegesCollection.map(featureDerivedPrivileges =>
                  featureDerivedPrivileges.getActions(privilege, feature)
                )
              ),
            ];
          }, [])
        )
      )
    );
  }

  private includeInBaseRead(privilegeId: string, privilege: FeatureKibanaPrivileges): boolean {
    return privilegeId === 'read' || Boolean(privilege.grantWithBaseRead);
  }

  private buildFeaturePrivileges(feature: Feature): Record<string, string[]> {
    return mapValues(feature.privileges, privilegeDefinition => [
      this.actions.login,
      this.actions.version,
      ...flatten(
        this.featureDerivedPrivilegesCollection.map(featureDerivedPrivileges =>
          featureDerivedPrivileges.getActions(privilegeDefinition, feature)
        )
      ),
    ]);
  }
}
