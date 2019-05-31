/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LICENSE_TYPE_BASIC, LicenseType } from '../../../common/constants';
import { RepositoryType } from './types';

const PLUGIN_NAME = 'Snapshot Repositories';

export const PLUGIN = {
  ID: 'snapshot_restore',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType,
  getI18nName: (translate: (key: string, config: object) => string): string => {
    return translate('xpack.snapshotRestore.appName', {
      defaultMessage: PLUGIN_NAME,
    });
  },
};

export const API_BASE_PATH = '/api/snapshot_restore/';

export enum REPOSITORY_TYPES {
  fs = 'fs',
  url = 'url',
  source = 'source',
  s3 = 's3',
  hdfs = 'hdfs',
  azure = 'azure',
  gcs = 'gcs',
}

// Deliberately do not include `source` as a default repository since we treat it as a flag
export const DEFAULT_REPOSITORY_TYPES: RepositoryType[] = [
  REPOSITORY_TYPES.fs,
  REPOSITORY_TYPES.url,
];

export const PLUGIN_REPOSITORY_TYPES: RepositoryType[] = [
  REPOSITORY_TYPES.s3,
  REPOSITORY_TYPES.hdfs,
  REPOSITORY_TYPES.azure,
  REPOSITORY_TYPES.gcs,
];

export const REPOSITORY_PLUGINS_MAP: { [key: string]: RepositoryType } = {
  'repository-s3': REPOSITORY_TYPES.s3,
  'repository-hdfs': REPOSITORY_TYPES.hdfs,
  'repository-azure': REPOSITORY_TYPES.azure,
  'repository-gcs': REPOSITORY_TYPES.gcs,
};

export const APP_PERMISSIONS = ['create_snapshot', 'cluster:admin/repository'];
