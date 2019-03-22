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
