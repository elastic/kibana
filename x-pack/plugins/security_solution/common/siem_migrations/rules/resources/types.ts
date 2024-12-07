/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OriginalRule,
  RuleMigrationResourceData,
  RuleMigrationResourceType,
} from '../../model/rule_migration.gen';

export interface RuleResource {
  type: RuleMigrationResourceType;
  name: string;
}
export type ResourceIdentifier = (input: string) => RuleResource[];

export interface ResourceIdentifiers {
  fromOriginalRule: (originalRule: OriginalRule) => RuleResource[];
  fromResource: (resource: RuleMigrationResourceData) => RuleResource[];
}
