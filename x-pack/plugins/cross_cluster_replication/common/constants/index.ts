/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { LicenseType } from '../../../licensing/common/types';

const platinumLicense: LicenseType = 'platinum';

export const PLUGIN = {
  ID: 'crossClusterReplication',
  TITLE: i18n.translate('xpack.crossClusterReplication.appTitle', {
    defaultMessage: 'Cross-Cluster Replication',
  }),
  minimumLicenseType: platinumLicense,
};

export const APPS = {
  CCR_APP: 'ccr',
  REMOTE_CLUSTER_APP: 'remote_cluster',
};

export const MANAGEMENT_ID = 'cross_cluster_replication';
export const BASE_PATH = `/management/data/${MANAGEMENT_ID}`;
export const BASE_PATH_REMOTE_CLUSTERS = '/management/data/remote_clusters';
export const API_BASE_PATH = '/api/cross_cluster_replication';
export const API_REMOTE_CLUSTERS_BASE_PATH = '/api/remote_clusters';
export const API_INDEX_MANAGEMENT_BASE_PATH = '/api/index_management';

export const FOLLOWER_INDEX_ADVANCED_SETTINGS = {
  maxReadRequestOperationCount: 5120,
  maxOutstandingReadRequests: 12,
  maxReadRequestSize: '32mb',
  maxWriteRequestOperationCount: 5120,
  maxWriteRequestSize: '9223372036854775807b',
  maxOutstandingWriteRequests: 9,
  maxWriteBufferCount: 2147483647,
  maxWriteBufferSize: '512mb',
  maxRetryDelay: '500ms',
  readPollTimeout: '1m',
};
