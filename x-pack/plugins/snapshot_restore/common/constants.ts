/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC, LicenseType } from '../../../common/constants';

const PLUGIN_NAME = 'Snapshot and Restore';

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

export enum REPOSITORY_DOC_PATHS {
  default = 'modules-snapshots.html',
  fs = 'modules-snapshots.html#_shared_file_system_repository',
  url = 'modules-snapshots.html#_read_only_url_repository',
  source = 'modules-snapshots.html#_source_only_repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
}
