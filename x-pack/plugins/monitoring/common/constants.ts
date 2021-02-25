/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CommonAlertParamDetail } from './types/alerts';
import { AlertParamType } from './enums';

/**
 * Helper string to add as a tag in every logging call
 */
export const LOGGING_TAG = 'monitoring';
/**
 * Helper string to add as a tag in every logging call related to Kibana monitoring
 */
export const KIBANA_MONITORING_LOGGING_TAG = 'kibana-monitoring';

/**
 * The Monitoring API version is the expected API format that we export and expect to import.
 * @type {string}
 */
export const MONITORING_SYSTEM_API_VERSION = '7';
/**
 * The type name used within the Monitoring index to publish Kibana ops stats.
 * @type {string}
 */
export const KIBANA_STATS_TYPE_MONITORING = 'kibana_stats'; // similar to KIBANA_STATS_TYPE but rolled up into 10s stats from 5s intervals through ops_buffer
/**
 * The type name used within the Monitoring index to publish Kibana stats.
 * @type {string}
 */
export const KIBANA_SETTINGS_TYPE = 'kibana_settings';

/*
 * Key for the localStorage service
 */
export const STORAGE_KEY = 'xpack.monitoring.data';

/**
 * Units for derivative metric values
 */
export const NORMALIZED_DERIVATIVE_UNIT = '1s';

/*
 * Values for column sorting in table options
 * @type {number} 1 or -1
 */
export const EUI_SORT_ASCENDING = 'asc';
export const EUI_SORT_DESCENDING = 'desc';
export const SORT_ASCENDING = 1;
export const SORT_DESCENDING = -1;

/*
 * Chart colors
 * @type {string}
 */
export const CHART_LINE_COLOR = '#d2d2d2';
export const CHART_TEXT_COLOR = '#9c9c9c';

/*
 * Number of cluster alerts to show on overview page
 * @type {number}
 */
export const CLUSTER_ALERTS_SEARCH_SIZE = 3;

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are gte 1 month
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_LONG = 'M [months] d [days]';

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are lt 1 month but gt 1 minute
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_SHORT = ' d [days] h [hrs] m [min]';

/*
 * Format for moment-duration-format timestamp-to-duration template if the time diffs are lt 1 minute
 * @type {string}
 */
export const FORMAT_DURATION_TEMPLATE_TINY = ' s [seconds]';

/*
 * Simple unique values for Timestamp to duration flags. These are used for
 * determining if calculation should be formatted as "time until" (now to
 * timestamp) or "time since" (timestamp to now)
 */
export const CALCULATE_DURATION_SINCE = 'since';
export const CALCULATE_DURATION_UNTIL = 'until';

/**
 * In order to show ML Jobs tab in the Elasticsearch section / tab navigation, license must be supported
 */
export const ML_SUPPORTED_LICENSES = ['trial', 'platinum', 'enterprise'];

/**
 * Metadata service URLs for the different cloud services that have constant URLs (e.g., unlike GCP, which is a constant prefix).
 *
 * @type {Object}
 */
export const CLOUD_METADATA_SERVICES = {
  // We explicitly call out the version, 2016-09-02, rather than 'latest' to avoid unexpected changes
  AWS_URL: 'http://169.254.169.254/2016-09-02/dynamic/instance-identity/document',

  // 2017-04-02 is the first GA release of this API
  AZURE_URL: 'http://169.254.169.254/metadata/instance?api-version=2017-04-02',

  // GCP documentation shows both 'metadata.google.internal' (mostly) and '169.254.169.254' (sometimes)
  // To bypass potential DNS changes, the IP was used because it's shared with other cloud services
  GCP_URL_PREFIX: 'http://169.254.169.254/computeMetadata/v1/instance',
};

/**
 * Constants used by Logstash monitoring code
 */
export const LOGSTASH = {
  MAJOR_VER_REQD_FOR_PIPELINES: 6,

  /*
   * Names ES keys on for different Logstash pipeline queues.
   * @type {string}
   */
  QUEUE_TYPES: {
    MEMORY: 'memory',
    PERSISTED: 'persisted',
  },
};

export const DEBOUNCE_SLOW_MS = 17; // roughly how long it takes to render a frame at 60fps
export const DEBOUNCE_FAST_MS = 10; // roughly how long it takes to render a frame at 100fps

/**
 * Configuration key for setting the email address used for cluster alert notifications.
 */
export const CLUSTER_ALERTS_ADDRESS_CONFIG_KEY = 'cluster_alerts.email_notifications.email_address';

export const STANDALONE_CLUSTER_CLUSTER_UUID = '__standalone_cluster__';

export const INDEX_PATTERN = '.monitoring-*-6-*,.monitoring-*-7-*';
export const INDEX_PATTERN_KIBANA = '.monitoring-kibana-6-*,.monitoring-kibana-7-*';
export const INDEX_PATTERN_LOGSTASH = '.monitoring-logstash-6-*,.monitoring-logstash-7-*';
export const INDEX_PATTERN_BEATS = '.monitoring-beats-6-*,.monitoring-beats-7-*';
export const INDEX_ALERTS = '.monitoring-alerts-6*,.monitoring-alerts-7*';
export const INDEX_PATTERN_ELASTICSEARCH = '.monitoring-es-6-*,.monitoring-es-7-*';

// This is the unique token that exists in monitoring indices collected by metricbeat
export const METRICBEAT_INDEX_NAME_UNIQUE_TOKEN = '-mb-';

// We use this for metricbeat migration to identify specific products that we do not have constants for
export const ELASTICSEARCH_SYSTEM_ID = 'elasticsearch';

/**
 * The id of the infra source owned by the monitoring plugin.
 */
export const INFRA_SOURCE_ID = 'internal-stack-monitoring';

/*
 * These constants represent code paths within `getClustersFromRequest`
 * that an api call wants to invoke. This is meant as an optimization to
 * avoid unnecessary ES queries (looking at you logstash) when the data
 * is not used. In the long term, it'd be nice to have separate api calls
 * instead of this path logic.
 */
export const CODE_PATH_ALL = 'all';
export const CODE_PATH_ALERTS = 'alerts';
export const CODE_PATH_KIBANA = 'kibana';
export const CODE_PATH_ELASTICSEARCH = 'elasticsearch';
export const CODE_PATH_ML = 'ml';
export const CODE_PATH_BEATS = 'beats';
export const CODE_PATH_LOGSTASH = 'logstash';
export const CODE_PATH_APM = 'apm';
export const CODE_PATH_LICENSE = 'license';
export const CODE_PATH_LOGS = 'logs';

/**
 * The header sent by telemetry service when hitting Elasticsearch to identify query source
 * @type {string}
 */
export const TELEMETRY_QUERY_SOURCE = 'TELEMETRY';

/**
 * The name of the Kibana System ID used to publish and look up Kibana stats through the Monitoring system.
 * @type {string}
 */
export const KIBANA_SYSTEM_ID = 'kibana';

/**
 * The name of the Beats System ID used to publish and look up Beats stats through the Monitoring system.
 * @type {string}
 */
export const BEATS_SYSTEM_ID = 'beats';

/**
 * The name of the Apm System ID used to publish and look up Apm stats through the Monitoring system.
 * @type {string}
 */
export const APM_SYSTEM_ID = 'apm';

/**
 * The name of the Kibana System ID used to look up Logstash stats through the Monitoring system.
 * @type {string}
 */
export const LOGSTASH_SYSTEM_ID = 'logstash';

/**
 * The name of the Kibana System ID used to look up Reporting stats through the Monitoring system.
 * @type {string}
 */
export const REPORTING_SYSTEM_ID = 'reporting';

/**
 * The amount of time, in milliseconds, to wait between collecting kibana stats from es.
 *
 * Currently 24 hours kept in sync with reporting interval.
 * @type {Number}
 */
export const TELEMETRY_COLLECTION_INTERVAL = 86400000;

/**
 * The amount of time, in milliseconds, to fetch the cluster uuids from es.
 *
 * Currently 3 hours.
 * @type {Number}
 */
export const CLUSTER_DETAILS_FETCH_INTERVAL = 10800000;

/**
 * The amount of time, in milliseconds, to fetch the usage data from es.
 *
 * Currently 20 minutes.
 * @type {Number}
 */
export const USAGE_FETCH_INTERVAL = 1200000;

/**
 * The prefix for all alert types used by monitoring
 */
export const ALERT_PREFIX = 'monitoring_';
export const ALERT_LICENSE_EXPIRATION = `${ALERT_PREFIX}alert_license_expiration`;
export const ALERT_CLUSTER_HEALTH = `${ALERT_PREFIX}alert_cluster_health`;
export const ALERT_CPU_USAGE = `${ALERT_PREFIX}alert_cpu_usage`;
export const ALERT_DISK_USAGE = `${ALERT_PREFIX}alert_disk_usage`;
export const ALERT_NODES_CHANGED = `${ALERT_PREFIX}alert_nodes_changed`;
export const ALERT_ELASTICSEARCH_VERSION_MISMATCH = `${ALERT_PREFIX}alert_elasticsearch_version_mismatch`;
export const ALERT_KIBANA_VERSION_MISMATCH = `${ALERT_PREFIX}alert_kibana_version_mismatch`;
export const ALERT_LOGSTASH_VERSION_MISMATCH = `${ALERT_PREFIX}alert_logstash_version_mismatch`;
export const ALERT_MEMORY_USAGE = `${ALERT_PREFIX}alert_jvm_memory_usage`;
export const ALERT_MISSING_MONITORING_DATA = `${ALERT_PREFIX}alert_missing_monitoring_data`;
export const ALERT_THREAD_POOL_SEARCH_REJECTIONS = `${ALERT_PREFIX}alert_thread_pool_search_rejections`;
export const ALERT_THREAD_POOL_WRITE_REJECTIONS = `${ALERT_PREFIX}alert_thread_pool_write_rejections`;
export const ALERT_CCR_READ_EXCEPTIONS = `${ALERT_PREFIX}ccr_read_exceptions`;
export const ALERT_LARGE_SHARD_SIZE = `${ALERT_PREFIX}shard_size`;

/**
 * Legacy alerts details/label for server and public use
 */
export const LEGACY_ALERT_DETAILS = {
  [ALERT_CLUSTER_HEALTH]: {
    label: i18n.translate('xpack.monitoring.alerts.clusterHealth.label', {
      defaultMessage: 'Cluster health',
    }),
    description: i18n.translate('xpack.monitoring.alerts.clusterHealth.description', {
      defaultMessage: 'Alert when the health of the cluster changes.',
    }),
  },
  [ALERT_ELASTICSEARCH_VERSION_MISMATCH]: {
    label: i18n.translate('xpack.monitoring.alerts.elasticsearchVersionMismatch.label', {
      defaultMessage: 'Elasticsearch version mismatch',
    }),
    description: i18n.translate(
      'xpack.monitoring.alerts.elasticsearchVersionMismatch.description',
      {
        defaultMessage: 'Alert when the cluster has multiple versions of Elasticsearch.',
      }
    ),
  },
  [ALERT_KIBANA_VERSION_MISMATCH]: {
    label: i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.label', {
      defaultMessage: 'Kibana version mismatch',
    }),
    description: i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.description', {
      defaultMessage: 'Alert when the cluser has multiple versions of Kibana.',
    }),
  },
  [ALERT_LICENSE_EXPIRATION]: {
    label: i18n.translate('xpack.monitoring.alerts.licenseExpiration.label', {
      defaultMessage: 'License expiration',
    }),
    description: i18n.translate('xpack.monitoring.alerts.licenseExpiration.description', {
      defaultMessage: 'Alert when the cluster license is about to expire.',
    }),
  },
  [ALERT_LOGSTASH_VERSION_MISMATCH]: {
    label: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.label', {
      defaultMessage: 'Logstash version mismatch',
    }),
    description: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.description', {
      defaultMessage: 'Alert when the cluster has multiple versions of Logstash.',
    }),
  },
  [ALERT_NODES_CHANGED]: {
    label: i18n.translate('xpack.monitoring.alerts.nodesChanged.label', {
      defaultMessage: 'Nodes changed',
    }),
    description: i18n.translate('xpack.monitoring.alerts.nodesChanged.description', {
      defaultMessage: 'Alert when adding, removing, or restarting a node.',
    }),
  },
};

/**
 * Alerts details/label for server and public use
 */
export const ALERT_DETAILS = {
  [ALERT_CPU_USAGE]: {
    label: i18n.translate('xpack.monitoring.alerts.cpuUsage.label', {
      defaultMessage: 'CPU Usage',
    }),
    description: i18n.translate('xpack.monitoring.alerts.cpuUsage.description', {
      defaultMessage: 'Alert when the CPU load for a node is consistently high.',
    }),
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.cpuUsage.paramDetails.threshold.label', {
          defaultMessage: `Notify when CPU is over`,
        }),
        type: AlertParamType.Percentage,
      } as CommonAlertParamDetail,
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.cpuUsage.paramDetails.duration.label', {
          defaultMessage: `Look at the average over`,
        }),
        type: AlertParamType.Duration,
      } as CommonAlertParamDetail,
    },
  },
  [ALERT_DISK_USAGE]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.diskUsage.paramDetails.threshold.label', {
          defaultMessage: `Notify when disk capacity is over`,
        }),
        type: AlertParamType.Percentage,
      },
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.diskUsage.paramDetails.duration.label', {
          defaultMessage: `Look at the average over`,
        }),
        type: AlertParamType.Duration,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.diskUsage.label', {
      defaultMessage: 'Disk Usage',
    }),
    description: i18n.translate('xpack.monitoring.alerts.diskUsage.description', {
      defaultMessage: 'Alert when the disk usage for a node is consistently high.',
    }),
  },
  [ALERT_MEMORY_USAGE]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.memoryUsage.paramDetails.threshold.label', {
          defaultMessage: `Notify when memory usage is over`,
        }),
        type: AlertParamType.Percentage,
      },
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.memoryUsage.paramDetails.duration.label', {
          defaultMessage: `Look at the average over`,
        }),
        type: AlertParamType.Duration,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.memoryUsage.label', {
      defaultMessage: 'Memory Usage (JVM)',
    }),
    description: i18n.translate('xpack.monitoring.alerts.memoryUsage.description', {
      defaultMessage: 'Alert when a node reports high memory usage.',
    }),
  },
  [ALERT_MISSING_MONITORING_DATA]: {
    paramDetails: {
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.missingData.paramDetails.duration.label', {
          defaultMessage: `Notify if monitoring data is missing for the last`,
        }),
        type: AlertParamType.Duration,
      } as CommonAlertParamDetail,
      limit: {
        label: i18n.translate('xpack.monitoring.alerts.missingData.paramDetails.limit.label', {
          defaultMessage: `looking back`,
        }),
        type: AlertParamType.Duration,
      } as CommonAlertParamDetail,
    },
    label: i18n.translate('xpack.monitoring.alerts.missingData.label', {
      defaultMessage: 'Missing monitoring data',
    }),
    description: i18n.translate('xpack.monitoring.alerts.missingData.description', {
      defaultMessage: 'Alert when monitoring data is missing.',
    }),
  },
  [ALERT_THREAD_POOL_SEARCH_REJECTIONS]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.rejection.paramDetails.threshold.label', {
          defaultMessage: `Notify when {type} rejection count is over`,
          values: { type: 'search' },
        }),
        type: AlertParamType.Number,
      },
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.rejection.paramDetails.duration.label', {
          defaultMessage: `In the last`,
        }),
        type: AlertParamType.Duration,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.threadPoolRejections.label', {
      defaultMessage: 'Thread pool {type} rejections',
      values: { type: 'search' },
    }),
    description: i18n.translate('xpack.monitoring.alerts.searchThreadPoolRejections.description', {
      defaultMessage:
        'Alert when the number of rejections in the search thread pool exceeds the threshold.',
    }),
  },
  [ALERT_THREAD_POOL_WRITE_REJECTIONS]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.rejection.paramDetails.threshold.label', {
          defaultMessage: `Notify when {type} rejection count is over`,
          values: { type: 'write' },
        }),
        type: AlertParamType.Number,
      },
      duration: {
        label: i18n.translate('xpack.monitoring.alerts.rejection.paramDetails.duration.label', {
          defaultMessage: `In the last`,
        }),
        type: AlertParamType.Duration,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.threadPoolRejections.label', {
      defaultMessage: 'Thread pool {type} rejections',
      values: { type: 'write' },
    }),
    description: i18n.translate('xpack.monitoring.alerts.writeThreadPoolRejections.description', {
      defaultMessage:
        'Alert when the number of rejections in the write thread pool exceeds the threshold.',
    }),
  },
  [ALERT_CCR_READ_EXCEPTIONS]: {
    paramDetails: {
      duration: {
        label: i18n.translate(
          'xpack.monitoring.alerts.ccrReadExceptions.paramDetails.duration.label',
          {
            defaultMessage: `In the last`,
          }
        ),
        type: AlertParamType.Duration,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.label', {
      defaultMessage: 'CCR read exceptions',
    }),
    description: i18n.translate('xpack.monitoring.alerts.ccrReadExceptions.description', {
      defaultMessage: 'Alert if any CCR read exceptions have been detected.',
    }),
  },
  [ALERT_LARGE_SHARD_SIZE]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.shardSize.paramDetails.threshold.label', {
          defaultMessage: `Notify when a shard exceeds this size`,
        }),
        type: AlertParamType.Number,
        append: 'GB',
      },
      indexPattern: {
        label: i18n.translate('xpack.monitoring.alerts.shardSize.paramDetails.indexPattern.label', {
          defaultMessage: `Check the following index patterns`,
        }),
        placeholder: 'eg: data-*, *prod-data, -.internal-data*',
        type: AlertParamType.TextField,
      },
    },
    label: i18n.translate('xpack.monitoring.alerts.shardSize.label', {
      defaultMessage: 'Shard size',
    }),
    description: i18n.translate('xpack.monitoring.alerts.shardSize.description', {
      defaultMessage: 'Alert if an index (primary) shard is oversize.',
    }),
  },
};

export const ALERT_PANEL_MENU = [
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.clusterHealth', {
      defaultMessage: 'Cluster health',
    }),
    alerts: [
      { alertName: ALERT_NODES_CHANGED },
      { alertName: ALERT_CLUSTER_HEALTH },
      { alertName: ALERT_ELASTICSEARCH_VERSION_MISMATCH },
      { alertName: ALERT_KIBANA_VERSION_MISMATCH },
      { alertName: ALERT_LOGSTASH_VERSION_MISMATCH },
    ],
  },
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.resourceUtilization', {
      defaultMessage: 'Resource utilization',
    }),
    alerts: [
      { alertName: ALERT_CPU_USAGE },
      { alertName: ALERT_DISK_USAGE },
      { alertName: ALERT_MEMORY_USAGE },
      { alertName: ALERT_LARGE_SHARD_SIZE },
    ],
  },
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.errors', {
      defaultMessage: 'Errors and exceptions',
    }),
    alerts: [
      { alertName: ALERT_MISSING_MONITORING_DATA },
      { alertName: ALERT_LICENSE_EXPIRATION },
      { alertName: ALERT_THREAD_POOL_SEARCH_REJECTIONS },
      { alertName: ALERT_THREAD_POOL_WRITE_REJECTIONS },
      { alertName: ALERT_CCR_READ_EXCEPTIONS },
    ],
  },
];

/**
 * A listing of all alert types
 */
export const ALERTS = [
  ALERT_LICENSE_EXPIRATION,
  ALERT_CLUSTER_HEALTH,
  ALERT_CPU_USAGE,
  ALERT_DISK_USAGE,
  ALERT_NODES_CHANGED,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_LOGSTASH_VERSION_MISMATCH,
  ALERT_MEMORY_USAGE,
  ALERT_MISSING_MONITORING_DATA,
  ALERT_THREAD_POOL_SEARCH_REJECTIONS,
  ALERT_THREAD_POOL_WRITE_REJECTIONS,
  ALERT_CCR_READ_EXCEPTIONS,
  ALERT_LARGE_SHARD_SIZE,
];

/**
 * A list of all legacy alerts, which means they are powered by watcher
 */
export const LEGACY_ALERTS = [
  ALERT_LICENSE_EXPIRATION,
  ALERT_CLUSTER_HEALTH,
  ALERT_NODES_CHANGED,
  ALERT_ELASTICSEARCH_VERSION_MISMATCH,
  ALERT_KIBANA_VERSION_MISMATCH,
  ALERT_LOGSTASH_VERSION_MISMATCH,
];

/**
 * Matches the id for the built-in in email action type
 * See x-pack/plugins/actions/server/builtin_action_types/email.ts
 */
export const ALERT_ACTION_TYPE_EMAIL = '.email';
/**
 * Matches the id for the built-in in log action type
 * See x-pack/plugins/actions/server/builtin_action_types/log.ts
 */
export const ALERT_ACTION_TYPE_LOG = '.server-log';

/**
 * To enable modifing of alerts in under actions
 */
export const ALERT_REQUIRES_APP_CONTEXT = false;

export const ALERT_EMAIL_SERVICES = ['gmail', 'hotmail', 'icloud', 'outlook365', 'ses', 'yahoo'];

/**
 * The saved object type for various monitoring data
 */
export const SAVED_OBJECT_TELEMETRY = 'monitoring-telemetry';

export const TELEMETRY_METRIC_BUTTON_CLICK = 'btnclick__';
