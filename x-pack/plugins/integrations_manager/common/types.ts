/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// the contract with the registry
export interface IntegrationInfo {
  description: string;
  name: string;
  version: string;
  icon: string;
}

// copied from src/legacy/server/saved_objects/service/saved_objects_client.d.ts.
export interface SavedObjectAttributes {
  [key: string]: SavedObjectAttributes | string | number | boolean | null;
}

export interface SavedObject<T extends SavedObjectAttributes = any> {
  id: string;
  type: string;
  version?: string;
  updated_at?: string;
  error?: {
    message: string;
    statusCode: number;
  };
  attributes: T;
  references: SavedObjectReference[];
  migrationVersion?: MigrationVersion;
}

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

interface MigrationVersion {
  [pluginName: string]: string;
}
