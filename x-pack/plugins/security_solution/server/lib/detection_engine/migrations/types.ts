/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Bucket {
  key: number;
  doc_count: number;
}

export interface MigrationStatus {
  name: string;
  version: number;
  migration_versions: Bucket[];
  schema_versions: Bucket[];
}

export interface MigrationDetails {
  destinationIndex: string;
  sourceIndex: string;
  taskId: string;
}
