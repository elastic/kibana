/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const FSRepositoryType = 'fs';
export const ReadonlyRepositoryType = 'url';
export const SourceRepositoryType = 'source';
export const S3RepositoryType = 's3';
export const HDFSRepositoryType = 'hdfs';
export const AzureRepositoryType = 'azure';
export const GCSRepositoryType = 'gcs';

export const RepositoryTypeDocPath = 'modules-snapshots.html';
export const FSRepositoryTypeDocPath = 'modules-snapshots.html#_shared_file_system_repository';
export const ReadonlyRepositoryTypeDocPath = 'modules-snapshots.html#_read_only_url_repository';
export const SourceRepositoryTypeDocPath = 'modules-snapshots.html#_source_only_repository';
export const S3RepositoryTypeDocPath = 'repository-s3.html';
export const HDFSRepositoryTypeDocPath = 'repository-hdfs.html';
export const AzureRepositoryTypeDocPath = 'repository-azure.html';
export const GCSRepositoryTypeDocPath = 'repository-gcs.html';

export type RepositoryType =
  | typeof FSRepositoryType
  | typeof ReadonlyRepositoryType
  | typeof SourceRepositoryType
  | typeof S3RepositoryType
  | typeof HDFSRepositoryType
  | typeof AzureRepositoryType
  | typeof GCSRepositoryType;

export interface FSRepository {
  name: string;
  type: typeof FSRepositoryType;
  settings: {
    location: string;
    compress?: boolean;
    chunk_size?: string | null;
    max_restore_bytes_per_sec?: string;
    max_snapshot_bytes_per_sec?: string;
    readonly?: boolean;
  };
}

export interface ReadonlyRepository {
  name: string;
  type: typeof ReadonlyRepositoryType;
  settings: {
    url: string;
  };
}

export interface S3Repository {
  name: string;
  type: typeof S3RepositoryType;
  settings: {
    bucket: string;
    client?: string;
    base_path?: string;
    compress?: boolean;
    chunk_size?: string | null;
    server_side_encryption?: boolean;
    buffer_size?: string;
    canned_acl?: string;
    storage_class?: string;
  };
}

export interface HDFSRepository {
  name: string;
  type: typeof HDFSRepositoryType;
  settings: {
    uri: string;
    path: string;
    load_defaults?: boolean;
    compress?: boolean;
    chunk_size?: string | null;
    ['security.principal']?: string;
    [key: string]: any; // For conf.* settings
  };
}

export interface AzureRepository {
  name: string;
  type: typeof AzureRepositoryType;
  settings: {
    client?: string;
    container?: string;
    base_path?: string;
    compress?: boolean;
    chunk_size?: string | null;
    readonly?: boolean;
    location_mode?: string;
  };
}

export interface GCSRepository {
  name: string;
  type: typeof GCSRepositoryType;
  settings: {
    bucket: string;
    client?: string;
    base_path?: string;
    compress?: boolean;
    chunk_size?: string | null;
  };
}

export interface SourceRepository<T> {
  name: string;
  type: typeof SourceRepositoryType;
  settings: SourceRepositorySettings<T>;
}

export type SourceRepositorySettings<T> = T extends typeof FSRepositoryType
  ? FSRepository['settings']
  : T extends typeof S3RepositoryType
  ? S3Repository['settings']
  : T extends typeof HDFSRepositoryType
  ? HDFSRepository['settings']
  : T extends typeof AzureRepositoryType
  ? AzureRepository['settings']
  : T extends typeof GCSRepositoryType
  ? GCSRepository['settings']
  : any & {
      delegate_type: T;
    };

export type Repository<T = null> =
  | FSRepository
  | ReadonlyRepository
  | S3Repository
  | HDFSRepository
  | AzureRepository
  | GCSRepository
  | SourceRepository<T>;
