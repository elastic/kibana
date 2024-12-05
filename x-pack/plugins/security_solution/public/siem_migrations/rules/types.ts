/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationTaskStats } from '../../../common/siem_migrations/model/rule_migration.gen';

export interface RuleMigrationTask extends RuleMigrationTaskStats {
  /** The sequential number of the migration */
  number: number;
}
