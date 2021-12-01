/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../licensing/common/types';
import { RepositoryType } from './types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  id: 'snapshot_restore',
  minimumLicenseType: basicLicense,
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.snapshotRestore.appName', {
      defaultMessage: 'Snapshot and Restore',
    });
  },
};

export const MAJOR_VERSION = '8.0.0';

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

export const APP_REQUIRED_CLUSTER_PRIVILEGES = [
  'cluster:admin/snapshot',
  'cluster:admin/repository',
];
export const APP_RESTORE_INDEX_PRIVILEGES = ['monitor'];
export const APP_SLM_CLUSTER_PRIVILEGES = ['manage_slm', 'cluster:monitor/state'];

export const TIME_UNITS: { [key: string]: 'd' | 'h' | 'm' | 's' } = {
  DAY: 'd',
  HOUR: 'h',
  MINUTE: 'm',
  SECOND: 's',
};
