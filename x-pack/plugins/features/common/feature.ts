/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureKibanaPrivileges,
  FeatureKibanaPrivilegesGroup,
  SubFeatureKibanaPrivileges,
} from './feature_kibana_privileges';

export class Feature {
  constructor(private readonly config: IFeature) {}

  public get id() {
    return this.config.id;
  }

  public get navLinkId() {
    return this.config.navLinkId;
  }

  public get catalogue() {
    return this.config.catalogue;
  }

  public get excludeFromBasePrivileges() {
    return Boolean(this.config.excludeFromBasePrivileges);
  }

  public get reserved() {
    return this.config.reserved;
  }

  public toRaw() {
    return { ...this.config };
  }

  public *privilegeIterator({
    augmentWithSubFeaturePrivileges = true,
    predicate = () => true,
  }: {
    augmentWithSubFeaturePrivileges?: boolean;
    predicate?: (privilege: FeatureKibanaPrivileges, feature: Feature) => boolean;
  }): IterableIterator<FeatureKibanaPrivileges> {
    if (!this.config.privileges) {
      return [];
    }

    const allSubFeaturePrivileges = (
      (augmentWithSubFeaturePrivileges && this.config.subFeatures) ||
      []
    )
      .map(subFeature => subFeature.privilegeGroups.map(pg => pg.privileges))
      .flat(2);

    yield* this.config.privileges
      .filter(privilege => (predicate ? predicate(privilege, this) : true))
      .map(privilege => {
        const subFeaturePrivsToMerge = allSubFeaturePrivileges.filter(
          priv =>
            priv.includeInPrimaryFeaturePrivilege === privilege.id ||
            priv.includeInPrimaryFeaturePrivilege === 'read'
        );

        const subFeaturePrivileges: FeatureKibanaPrivileges = subFeaturePrivsToMerge.reduce(
          (acc, addon) => {
            return {
              ...acc,
              api: [...(acc.api || []), ...(addon.api || [])],
              app: [...(acc.app || []), ...(addon.app || [])],
              savedObject: {
                all: [...acc.savedObject.all, ...addon.savedObject.all],
                read: [...acc.savedObject.read, ...addon.savedObject.read],
              },
              ui: [...acc.ui, ...addon.ui],
            };
          },
          ({
            api: [],
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          } as unknown) as FeatureKibanaPrivileges
        );

        const mergedPrivilege: FeatureKibanaPrivileges = {
          ...privilege,
          api: privilege.api ? [...privilege.api, ...subFeaturePrivileges.api!] : undefined,
          app: privilege.app ? [...privilege.app, ...subFeaturePrivileges.app!] : undefined,
          ui: privilege.ui ? [...privilege.ui, ...subFeaturePrivileges.ui!] : [],
          savedObject: {
            all: [...privilege.savedObject.all, ...subFeaturePrivileges.savedObject.all],
            read: [...privilege.savedObject.read, ...subFeaturePrivileges.savedObject.read],
          },
        };

        return mergedPrivilege;
      });
  }

  public *subFeaturesPrivilegeIterator(): IterableIterator<SubFeatureKibanaPrivileges> {
    if (!this.config.subFeatures) {
      return [];
    }
    for (const subFeature of this.config.subFeatures) {
      yield* subFeature.privilegeGroups.map(pg => pg.privileges).flat(2);
    }
  }
}

export interface ISubFeature {
  name: string;
  privilegeGroups: FeatureKibanaPrivilegesGroup[];
}

/**
 * Interface for registering a feature.
 * Feature registration allows plugins to hide their applications with spaces,
 * and secure access when configured for security.
 */
export interface IFeature {
  /**
   * Unique identifier for this feature.
   * This identifier is also used when generating UI Capabilities.
   *
   * @see UICapabilities
   */
  id: string;

  /**
   * Display name for this feature.
   * This will be displayed to end-users, so a translatable string is advised for i18n.
   */
  name: string;

  /**
   * Whether or not this feature should be excluded from the base privileges.
   * This is primarily helpful when migrating applications with a "legacy" privileges model
   * to use Kibana privileges. We don't want these features to be considered part of the `all`
   * or `read` base privileges in a minor release if the user was previously granted access
   * using an additional reserved role.
   */
  excludeFromBasePrivileges?: boolean;

  /**
   * Optional array of supported licenses.
   * If omitted, all licenses are allowed.
   * This does not restrict access to your feature based on license.
   * Its only purpose is to inform the space and roles UIs on which features to display.
   */
  validLicenses?: Array<'basic' | 'standard' | 'gold' | 'platinum' | 'enterprise'>;

  /**
   * An optional EUI Icon to be used when displaying your feature.
   */
  icon?: string;

  /**
   * The optional Nav Link ID for feature.
   * If specified, your link will be automatically hidden if needed based on the current space and user permissions.
   */
  navLinkId?: string;

  /**
   * An array of app ids that are enabled when this feature is enabled.
   * Apps specified here will automatically cascade to the privileges defined below, unless specified differently there.
   */
  app: string[];

  /**
   * If this feature includes management sections, you can specify them here to control visibility of those
   * pages based on the current space.
   *
   * Items specified here will automatically cascade to the privileges defined below, unless specified differently there.
   *
   * @example
   * ```ts
   *  // Enables access to the "Advanced Settings" management page within the Kibana section
   *  management: {
   *    kibana: ['settings']
   *  }
   * ```
   */
  management?: {
    [sectionId: string]: string[];
  };
  /**
   * If this feature includes a catalogue entry, you can specify them here to control visibility based on the current space.
   *
   * Items specified here will automatically cascade to the privileges defined below, unless specified differently there.
   */
  catalogue?: string[];

  /**
   * Feature privilege definition.
   *
   * @example
   * ```ts
   *  {
   *    all: {...},
   *    read: {...}
   *  }
   * ```
   * @see FeatureKibanaPrivileges
   */
  privileges?: FeatureKibanaPrivileges[];

  subFeatures?: ISubFeature[];

  /**
   * Optional message to display on the Role Management screen when configuring permissions for this feature.
   */
  privilegesTooltip?: string;

  /**
   * @private
   */
  reserved?: {
    privilege: FeatureKibanaPrivileges;
    description: string;
  };
}
