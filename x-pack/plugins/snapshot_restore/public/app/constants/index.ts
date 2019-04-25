/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/snapshot_restore';
export const DEFAULT_SECTION: Section = 'repositories';
export type Section = 'repositories' | 'snapshots';

// Set a minimum request duration to avoid strange UI flickers
export const MINIMUM_TIMEOUT_MS = 300;

export enum REPOSITORY_DOC_PATHS {
  default = 'modules-snapshots.html',
  fs = 'modules-snapshots.html#_shared_file_system_repository',
  url = 'modules-snapshots.html#_read_only_url_repository',
  source = 'modules-snapshots.html#_source_only_repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
  plugins = 'repository.html',
}

export enum SNAPSHOT_STATE {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  INCOMPATIBLE = 'INCOMPATIBLE',
}
