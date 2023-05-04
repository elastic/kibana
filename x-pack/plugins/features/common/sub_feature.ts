/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecursiveReadonly } from '@kbn/utility-types';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

/**
 * Configuration for a sub-feature.
 */
export interface SubFeatureConfig {
  /** Display name for this sub-feature */
  name: string;

  /**
   * Whether or not this privilege should only be granted to `All Spaces *`. Should be used for features that do not
   * support Spaces. Defaults to `false`.
   */
  requireAllSpaces?: boolean;

  /**
   * Optional message to display on the Role Management screen when configuring permissions for this feature.
   */
  privilegesTooltip?: string;

  /** Collection of privilege groups */
  privilegeGroups: readonly SubFeaturePrivilegeGroupConfig[];

  /**
   * An optional description that will appear as subtext underneath the sub-feature name
   */
  description?: string;
}

/**
 * The type of privilege group.
 * - `mutually_exclusive`::
 *     Users will be able to select at most one privilege within this group.
 *     Privileges must be specified in descending order of permissiveness (e.g. `All`, `Read`, not `Read`, `All)
 * - `independent`::
 *     Users will be able to select any combination of privileges within this group.
 */
export type SubFeaturePrivilegeGroupType = 'mutually_exclusive' | 'independent';

/**
 * Configuration for a sub-feature privilege group.
 */
export interface SubFeaturePrivilegeGroupConfig {
  /**
   * The type of privilege group.
   * - `mutually_exclusive`::
   *     Users will be able to select at most one privilege within this group.
   *     Privileges must be specified in descending order of permissiveness (e.g. `All`, `Read`, not `Read`, `All)
   * - `independent`::
   *     Users will be able to select any combination of privileges within this group.
   */
  groupType: SubFeaturePrivilegeGroupType;

  /**
   * The privileges which belong to this group.
   */
  privileges: readonly SubFeaturePrivilegeConfig[];
}

/**
 * Configuration for a sub-feature privilege.
 */
export interface SubFeaturePrivilegeConfig
  extends Omit<FeatureKibanaPrivileges, 'excludeFromBasePrivileges'> {
  /**
   * Identifier for this privilege. Must be unique across all other privileges within a feature.
   */
  id: string;

  /**
   * The display name for this privilege.
   */
  name: string;

  /**
   * Denotes which Primary Feature Privilege this sub-feature privilege should be included in.
   * `read` is also included in `all` automatically.
   */
  includeIn: 'all' | 'read' | 'none';

  /**
   * The minimum supported license level for this sub-feature privilege.
   * If no license level is supplied, then this privilege will be available for all licences
   * that are valid for the overall feature.
   */
  minimumLicense?: LicenseType;
}

export class SubFeature {
  constructor(protected readonly config: RecursiveReadonly<SubFeatureConfig>) {}

  public get name() {
    return this.config.name;
  }

  public get privilegeGroups() {
    return this.config.privilegeGroups;
  }

  public get requireAllSpaces() {
    return this.config.requireAllSpaces ?? false;
  }

  public get description() {
    return this.config.description || '';
  }

  public toRaw() {
    return { ...this.config };
  }
}
