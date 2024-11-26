/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleMigration,
  RuleMigrationResource,
} from '../../../../common/siem_migrations/model/rule_migration.gen';

export type Stored<T extends object> = T & { id: string };

export type StoredRuleMigration = Stored<RuleMigration>;
export type StoredRuleMigrationResource = Stored<RuleMigrationResource>;
