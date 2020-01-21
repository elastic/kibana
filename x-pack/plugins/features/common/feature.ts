/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from './feature_kibana_privileges';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { SubFeature, SubFeatureConfig } from './sub_feature';
import { FeaturePrivilege } from './feature_privilege';

export class Feature {
  constructor(private readonly config: IFeature) {}

  public get id() {
    return this.config.id;
  }

  public get name() {
    return this.config.name;
  }

  public get navLinkId() {
    return this.config.navLinkId;
  }

  public get app() {
    return this.config.app;
  }

  public get catalogue() {
    return this.config.catalogue;
  }

  public get management() {
    return this.config.management;
  }

  public get excludeFromBasePrivileges() {
    return Boolean(this.config.excludeFromBasePrivileges);
  }

  public get icon() {
    return this.config.icon;
  }

  public get privilegesTooltip() {
    return this.config.privilegesTooltip;
  }

  public get reserved() {
    return this.config.reserved
      ? {
          // TODO priv id
          privilege: new FeaturePrivilege('_reserved_', this.config.reserved.privilege),
          description: this.config.reserved.description,
        }
      : undefined;
  }

  public get primaryFeaturePrivileges() {
    return Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) => new PrimaryFeaturePrivilege(id, privilege)
    );
  }

  public get minimalPrimaryFeaturePrivileges() {
    return Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) => new PrimaryFeaturePrivilege(`minimal_${id}`, privilege)
    );
  }

  public get subFeatures() {
    if (Array.isArray(this.config.subFeatures)) {
      return this.config.subFeatures.map(sf => new SubFeature(sf));
    }
    return [];
  }

  public toRaw() {
    return { ...this.config };
  }

  // TODO: this is a shim
  public get privileges() {
    return this.primaryFeaturePrivileges;
  }

  public *privilegeIterator({
    augmentWithSubFeaturePrivileges = true,
    predicate = () => true,
  }: {
    augmentWithSubFeaturePrivileges?: boolean;
    predicate?: (privilege: PrimaryFeaturePrivilege, feature: Feature) => boolean;
  }): IterableIterator<PrimaryFeaturePrivilege> {
    if (!this.config.privileges) {
      return [];
    }

    const allSubFeaturePrivileges: SubFeaturePrivilege[] = [];

    if (augmentWithSubFeaturePrivileges) {
      for (const subFeature of this.subFeatures) {
        for (const subFeaturePriv of subFeature.privilegeIterator()) {
          allSubFeaturePrivileges.push(subFeaturePriv);
        }
      }
    }

    yield* this.primaryFeaturePrivileges
      .filter(privilege => (predicate ? predicate(privilege, this) : true))
      .map(privilege => {
        const subFeaturePrivsToMerge = allSubFeaturePrivileges.filter(priv =>
          priv.includeIn(privilege)
        );

        const subFeaturePrivileges: SubFeaturePrivilege = subFeaturePrivsToMerge.reduce(
          (acc, addon) => {
            return acc.merge(addon);
          },
          SubFeaturePrivilege.empty()
        );

        const mergedPrivilege = privilege.merge(subFeaturePrivileges);

        return mergedPrivilege;
      });
  }

  public *subFeaturePrivilegeIterator(): IterableIterator<SubFeaturePrivilege> {
    for (const subFeature of this.subFeatures) {
      yield* subFeature.privilegeIterator();
    }
  }
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
  privileges?: {
    all: FeatureKibanaPrivileges;
    read: FeatureKibanaPrivileges;
  };

  subFeatures?: SubFeatureConfig[];

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
