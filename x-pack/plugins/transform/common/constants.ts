/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { TransformHealthTests } from './types/alerting';

export const DEFAULT_REFRESH_INTERVAL_MS = 30000;
export const MINIMUM_REFRESH_INTERVAL_MS = 1000;
export const PROGRESS_REFRESH_INTERVAL_MS = 2000;

export const DEFAULT_MAX_AUDIT_MESSAGE_SIZE = 500;

export const PLUGIN = {
  ID: 'transform',
  MINIMUM_LICENSE_REQUIRED: 'basic' as LicenseType,
  getI18nName: (): string => {
    return i18n.translate('xpack.transform.appName', {
      defaultMessage: 'Transforms',
    });
  },
};

export const API_BASE_PATH = '/api/transform/';

// In order to create a transform, the API requires the following privileges:
// - transform_admin (builtin)
//   - cluster privileges: manage_transform
//   - index privileges:
//     - indices: .transform-notifications-*, .data-frame-notifications-*, .transform-notifications-read
//     - privileges: view_index_metadata, read
// - transform_user (builtin)
//   - cluster privileges: monitor_transform
//   - index privileges:
//     - indices: .transform-notifications-*, .data-frame-notifications-*, .transform-notifications-read
//     - privileges: view_index_metadata, read
// - source index: read, view_index_metadata (can be applied to a pattern e.g. farequote-*)
// - dest index: index, create_index (can be applied to a pattern e.g. df-*)
//
// In the UI additional privileges are required:
// - kibana_admin (builtin)
// - dest index: monitor (applied to df-*)
// - cluster: monitor, read_pipeline
//
// Note that users with kibana_admin can see all Kibana data views and saved searches
// in the source selection modal when creating a transform, but the wizard will trigger
// error callouts when there are no sufficient privileges to read the actual source indices.

export const APP_CLUSTER_PRIVILEGES = [
  'cluster:monitor/transform/get',
  'cluster:monitor/transform/stats/get',
  'cluster:admin/transform/delete',
  'cluster:admin/transform/preview',
  'cluster:admin/transform/put',
  'cluster:admin/transform/reset',
  'cluster:admin/transform/start',
  'cluster:admin/transform/start_task',
  'cluster:admin/transform/stop',
];

// Minimum privileges required to return transform node count
export const NODES_INFO_PRIVILEGES = ['cluster:monitor/transform/get'];

// Equivalent of capabilities.canGetTransform
export const APP_GET_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/transform/get',
  'cluster.cluster:monitor/transform/stats/get',
];

// Equivalent of capabilities.canCreateTransform
export const APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/transform/get',
  'cluster.cluster:monitor/transform/stats/get',
  'cluster.cluster:admin/transform/preview',
  'cluster.cluster:admin/transform/put',
  'cluster.cluster:admin/transform/start',
  'cluster.cluster:admin/transform/start_task',
];

export const APP_INDEX_PRIVILEGES = ['monitor'];

// reflects https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/transforms/TransformStats.java#L250
export const TRANSFORM_STATE = {
  ABORTING: 'aborting',
  FAILED: 'failed',
  INDEXING: 'indexing',
  STARTED: 'started',
  STOPPED: 'stopped',
  STOPPING: 'stopping',
  WAITING: 'waiting',
} as const;

export type TransformState = typeof TRANSFORM_STATE[keyof typeof TRANSFORM_STATE];

export const TRANSFORM_HEALTH = {
  green: 'green',
  unknown: 'unknown',
  yellow: 'yellow',
  red: 'red',
} as const;

export type TransformHealth = typeof TRANSFORM_HEALTH[keyof typeof TRANSFORM_HEALTH];

export const TRANSFORM_HEALTH_COLOR = {
  green: 'success',
  unknown: 'subdued',
  yellow: 'warning',
  red: 'danger',
} as const;

export const TRANSFORM_HEALTH_LABEL = {
  green: i18n.translate('xpack.transform.transformHealth.greenLabel', {
    defaultMessage: 'Healthy',
  }),
  unknown: i18n.translate('xpack.transform.transformHealth.unknownLabel', {
    defaultMessage: 'Unknown',
  }),
  yellow: i18n.translate('xpack.transform.transformHealth.yellowLabel', {
    defaultMessage: 'Degraded',
  }),
  red: i18n.translate('xpack.transform.transformHealth.redLabel', {
    defaultMessage: 'Unavailable',
  }),
} as const;

export const TRANSFORM_HEALTH_DESCRIPTION = {
  green: i18n.translate('xpack.transform.transformHealth.greenDescription', {
    defaultMessage: 'The transform is running as expected.',
  }),
  unknown: i18n.translate('xpack.transform.transformHealth.unknownDescription', {
    defaultMessage: 'The health of the transform could not be determined.',
  }),
  yellow: i18n.translate('xpack.transform.transformHealth.yellowDescription', {
    defaultMessage:
      'The functionality of the transform is in a degraded state and may need remediation to avoid the health becoming red.',
  }),
  red: i18n.translate('xpack.transform.transformHealth.redDescription', {
    defaultMessage: 'The transform is experiencing an outage or is unavailable for use.',
  }),
} as const;

export const TRANSFORM_MODE = {
  BATCH: 'batch',
  CONTINUOUS: 'continuous',
} as const;

export type TransformMode = typeof TRANSFORM_MODE[keyof typeof TRANSFORM_MODE];

export const TRANSFORM_FUNCTION = {
  PIVOT: 'pivot',
  LATEST: 'latest',
} as const;

export type TransformFunction = typeof TRANSFORM_FUNCTION[keyof typeof TRANSFORM_FUNCTION];

export const TRANSFORM_RULE_TYPE = {
  TRANSFORM_HEALTH: 'transform_health',
} as const;

export const ALL_TRANSFORMS_SELECTION = '*';

export const TRANSFORM_HEALTH_CHECK_NAMES: Record<
  TransformHealthTests,
  { name: string; description: string }
> = {
  notStarted: {
    name: i18n.translate('xpack.transform.alertTypes.transformHealth.notStartedCheckName', {
      defaultMessage: 'Transform is not started',
    }),
    description: i18n.translate(
      'xpack.transform.alertTypes.transformHealth.notStartedCheckDescription',
      {
        defaultMessage: 'Get alerts when the transform is not started or is not indexing data.',
      }
    ),
  },
  errorMessages: {
    name: i18n.translate('xpack.transform.alertTypes.transformHealth.errorMessagesCheckName', {
      defaultMessage: 'Errors in transform messages',
    }),
    description: i18n.translate(
      'xpack.transform.alertTypes.transformHealth.errorMessagesCheckDescription',
      {
        defaultMessage: 'Get alerts if a transform contains errors in the transform messages.',
      }
    ),
  },
};

// Transform API default values https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html
export const DEFAULT_CONTINUOUS_MODE_DELAY = '60s';
export const DEFAULT_TRANSFORM_FREQUENCY = '1m';
export const DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND = null;
export const DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE = 500;

// Used in the transform list's expanded row for the messages and issues table.
export const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
