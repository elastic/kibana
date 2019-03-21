/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type FSRepositoryType = 'fs';
export type ReadonlyRepositoryType = 'url';
export type SourceRepositoryType = 'source';
export type S3RepositoryType = 's3';
export type HDFSRepositoryType = 'hdfs';
export type AzureRepositoryType = 'azure';
export type GCSRepositoryType = 'gcs';

export enum RepositoryTypes {
  fs = 'fs',
  url = 'url',
  source = 'source',
  s3 = 's3',
  hdfs = 'hdfs',
  azure = 'azure',
  gcs = 'gcs',
}

export type RepositoryType =
  | FSRepositoryType
  | ReadonlyRepositoryType
  | SourceRepositoryType
  | S3RepositoryType
  | HDFSRepositoryType
  | AzureRepositoryType
  | GCSRepositoryType;

export enum RepositoryDocPaths {
  default = 'modules-snapshots.html',
  fs = 'modules-snapshots.html#_shared_file_system_repository',
  url = 'modules-snapshots.html#_read_only_url_repository',
  source = 'modules-snapshots.html#_source_only_repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
}

export interface FSRepository {
  name: string;
  type: FSRepositoryType;
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
  type: ReadonlyRepositoryType;
  settings: {
    url: string;
  };
}

export interface S3Repository {
  name: string;
  type: S3RepositoryType;
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
  type: HDFSRepositoryType;
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
  type: AzureRepositoryType;
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
  type: GCSRepositoryType;
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
  type: SourceRepositoryType;
  settings: SourceRepositorySettings<T>;
}

export type SourceRepositorySettings<T> = T extends FSRepositoryType
  ? FSRepository['settings']
  : T extends S3RepositoryType
  ? S3Repository['settings']
  : T extends HDFSRepositoryType
  ? HDFSRepository['settings']
  : T extends AzureRepositoryType
  ? AzureRepository['settings']
  : T extends GCSRepositoryType
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
