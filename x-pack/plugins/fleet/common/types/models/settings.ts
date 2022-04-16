/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAttributes } from '@kbn/core/public';

export interface BaseSettings {
  has_seen_add_data_notice?: boolean;
  has_seen_fleet_migration_notice?: boolean;
  fleet_server_hosts: string[];
}

export interface Settings extends BaseSettings {
  id: string;
}

export interface SettingsSOAttributes extends BaseSettings, SavedObjectAttributes {}
