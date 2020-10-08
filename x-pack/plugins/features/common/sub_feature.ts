/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RecursiveReadonly } from '@kbn/utility-types';
import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

/**
 * Configuration for a sub-feature.
 */
export interface SubFeatureConfig {
  /** Display name for this sub-feature */
  name: string;

  /** Collection of privilege groups */
  privilegeGroups: readonly SubFeaturePrivilegeGroupConfig[];
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
}

export class SubFeature {
  constructor(protected readonly config: RecursiveReadonly<SubFeatureConfig>) {}

  public get name() {
    return this.config.name;
  }

  public get privilegeGroups() {
    return this.config.privilegeGroups;
  }

  public toRaw() {
    return { ...this.config };
  }
}
