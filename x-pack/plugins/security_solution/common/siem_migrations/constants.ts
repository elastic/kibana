/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIEM_MIGRATIONS_PATH = '/internal/siem_migrations' as const;
export const SIEM_RULE_MIGRATIONS_PATH = `${SIEM_MIGRATIONS_PATH}/rules` as const;

export const SIEM_RULE_MIGRATIONS_START_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id}/start` as const;
export const SIEM_RULE_MIGRATIONS_STATS_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id}/stats` as const;
export const SIEM_RULE_MIGRATIONS_CANCEL_PATH =
  `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id}/cancel` as const;

export enum SiemMigrationsStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  FINISHED = 'finished',
  ERROR = 'error',
}
