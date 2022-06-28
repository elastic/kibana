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

export const CCS_REMOTE_PATTERN = '*';
export const INDEX_PATTERN = '.monitoring-*';
export const INDEX_PATTERN_KIBANA = '.monitoring-kibana-*';
export const INDEX_PATTERN_LOGSTASH = '.monitoring-logstash-*';
export const INDEX_PATTERN_BEATS = '.monitoring-beats-*';
export const INDEX_ALERTS = '.monitoring-alerts-*';
export const INDEX_PATTERN_ELASTICSEARCH = '.monitoring-es-*';
// ECS-compliant patterns (metricbeat >8 and agent)
export const INDEX_PATTERN_ELASTICSEARCH_ECS = '.monitoring-es-8-*';
export const INDEX_PATTERN_ENTERPRISE_SEARCH = '.monitoring-ent-search-*';
export const DS_INDEX_PATTERN_METRICS = 'metrics';
export const DS_INDEX_PATTERN_LOGS = 'logs';
export const DS_INDEX_PATTERN_ES = 'elasticsearch';

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
export const CODE_PATH_ENTERPRISE_SEARCH = 'enterprise_search';

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
 * The name of the Enterprise Search System ID used to publish and look up Enterprise Search stats through the Monitoring system.
 * @type {string}
 */
export const ENTERPRISE_SEARCH_SYSTEM_ID = 'enterprise_search';

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
 * The prefix for all rule types used by monitoring
 */
export const RULE_PREFIX = 'monitoring_';
export const RULE_LICENSE_EXPIRATION = `${RULE_PREFIX}alert_license_expiration`;
export const RULE_CLUSTER_HEALTH = `${RULE_PREFIX}alert_cluster_health`;
export const RULE_CPU_USAGE = `${RULE_PREFIX}alert_cpu_usage`;
export const RULE_DISK_USAGE = `${RULE_PREFIX}alert_disk_usage`;
export const RULE_NODES_CHANGED = `${RULE_PREFIX}alert_nodes_changed`;
export const RULE_ELASTICSEARCH_VERSION_MISMATCH = `${RULE_PREFIX}alert_elasticsearch_version_mismatch`;
export const RULE_KIBANA_VERSION_MISMATCH = `${RULE_PREFIX}alert_kibana_version_mismatch`;
export const RULE_LOGSTASH_VERSION_MISMATCH = `${RULE_PREFIX}alert_logstash_version_mismatch`;
export const RULE_MEMORY_USAGE = `${RULE_PREFIX}alert_jvm_memory_usage`;
export const RULE_MISSING_MONITORING_DATA = `${RULE_PREFIX}alert_missing_monitoring_data`;
export const RULE_THREAD_POOL_SEARCH_REJECTIONS = `${RULE_PREFIX}alert_thread_pool_search_rejections`;
export const RULE_THREAD_POOL_WRITE_REJECTIONS = `${RULE_PREFIX}alert_thread_pool_write_rejections`;
export const RULE_CCR_READ_EXCEPTIONS = `${RULE_PREFIX}ccr_read_exceptions`;
export const RULE_LARGE_SHARD_SIZE = `${RULE_PREFIX}shard_size`;

/**
 * Legacy rules details/label for server and public use
 */
export const LEGACY_RULE_DETAILS = {
  [RULE_CLUSTER_HEALTH]: {
    label: i18n.translate('xpack.monitoring.alerts.clusterHealth.label', {
      defaultMessage: 'Cluster health',
    }),
    description: i18n.translate('xpack.monitoring.alerts.clusterHealth.description', {
      defaultMessage: 'Alert when the health of the cluster changes.',
    }),
  },
  [RULE_ELASTICSEARCH_VERSION_MISMATCH]: {
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
  [RULE_KIBANA_VERSION_MISMATCH]: {
    label: i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.label', {
      defaultMessage: 'Kibana version mismatch',
    }),
    description: i18n.translate('xpack.monitoring.alerts.kibanaVersionMismatch.description', {
      defaultMessage: 'Alert when the cluser has multiple versions of Kibana.',
    }),
  },
  [RULE_LICENSE_EXPIRATION]: {
    label: i18n.translate('xpack.monitoring.alerts.licenseExpiration.label', {
      defaultMessage: 'License expiration',
    }),
    description: i18n.translate('xpack.monitoring.alerts.licenseExpiration.description', {
      defaultMessage: 'Alert when the cluster license is about to expire.',
    }),
  },
  [RULE_LOGSTASH_VERSION_MISMATCH]: {
    label: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.label', {
      defaultMessage: 'Logstash version mismatch',
    }),
    description: i18n.translate('xpack.monitoring.alerts.logstashVersionMismatch.description', {
      defaultMessage: 'Alert when the cluster has multiple versions of Logstash.',
    }),
  },
  [RULE_NODES_CHANGED]: {
    label: i18n.translate('xpack.monitoring.alerts.nodesChanged.label', {
      defaultMessage: 'Nodes changed',
    }),
    description: i18n.translate('xpack.monitoring.alerts.nodesChanged.description', {
      defaultMessage: 'Alert when adding, removing, or restarting a node.',
    }),
  },
};

/**
 * Rules details/label for server and public use
 */
export const RULE_DETAILS = {
  [RULE_CPU_USAGE]: {
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
  [RULE_DISK_USAGE]: {
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
  [RULE_MEMORY_USAGE]: {
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
  [RULE_MISSING_MONITORING_DATA]: {
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
  [RULE_THREAD_POOL_SEARCH_REJECTIONS]: {
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
  [RULE_THREAD_POOL_WRITE_REJECTIONS]: {
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
  [RULE_CCR_READ_EXCEPTIONS]: {
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
  [RULE_LARGE_SHARD_SIZE]: {
    paramDetails: {
      threshold: {
        label: i18n.translate('xpack.monitoring.alerts.shardSize.paramDetails.threshold.label', {
          defaultMessage: `Notify when average shard size exceeds this value`,
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
      defaultMessage: 'Alert if the average shard size is larger than the configured threshold.',
    }),
  },
};

export const RULE_PANEL_MENU = [
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.clusterHealth', {
      defaultMessage: 'Cluster health',
    }),
    rules: [
      { ruleName: RULE_NODES_CHANGED },
      { ruleName: RULE_CLUSTER_HEALTH },
      { ruleName: RULE_ELASTICSEARCH_VERSION_MISMATCH },
      { ruleName: RULE_KIBANA_VERSION_MISMATCH },
      { ruleName: RULE_LOGSTASH_VERSION_MISMATCH },
    ],
  },
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.resourceUtilization', {
      defaultMessage: 'Resource utilization',
    }),
    rules: [
      { ruleName: RULE_CPU_USAGE },
      { ruleName: RULE_DISK_USAGE },
      { ruleName: RULE_MEMORY_USAGE },
      { ruleName: RULE_LARGE_SHARD_SIZE },
    ],
  },
  {
    label: i18n.translate('xpack.monitoring.alerts.badge.panelCategory.errors', {
      defaultMessage: 'Errors and exceptions',
    }),
    rules: [
      { ruleName: RULE_MISSING_MONITORING_DATA },
      { ruleName: RULE_LICENSE_EXPIRATION },
      { ruleName: RULE_THREAD_POOL_SEARCH_REJECTIONS },
      { ruleName: RULE_THREAD_POOL_WRITE_REJECTIONS },
      { ruleName: RULE_CCR_READ_EXCEPTIONS },
    ],
  },
];

/**
 * A listing of all rule types
 */
export const RULES = [
  RULE_LICENSE_EXPIRATION,
  RULE_CLUSTER_HEALTH,
  RULE_CPU_USAGE,
  RULE_DISK_USAGE,
  RULE_NODES_CHANGED,
  RULE_ELASTICSEARCH_VERSION_MISMATCH,
  RULE_KIBANA_VERSION_MISMATCH,
  RULE_LOGSTASH_VERSION_MISMATCH,
  RULE_MEMORY_USAGE,
  RULE_MISSING_MONITORING_DATA,
  RULE_THREAD_POOL_SEARCH_REJECTIONS,
  RULE_THREAD_POOL_WRITE_REJECTIONS,
  RULE_CCR_READ_EXCEPTIONS,
  RULE_LARGE_SHARD_SIZE,
];

/**
 * A list of all legacy rules, which means they are powered by watcher
 */
export const LEGACY_RULES = [
  RULE_LICENSE_EXPIRATION,
  RULE_CLUSTER_HEALTH,
  RULE_NODES_CHANGED,
  RULE_ELASTICSEARCH_VERSION_MISMATCH,
  RULE_KIBANA_VERSION_MISMATCH,
  RULE_LOGSTASH_VERSION_MISMATCH,
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
 * To enable modifing of rules in under actions
 */
export const RULE_REQUIRES_APP_CONTEXT = false;

export const ALERT_EMAIL_SERVICES = ['gmail', 'hotmail', 'icloud', 'outlook365', 'ses', 'yahoo'];

/**
 * The saved object type for various monitoring data
 */
export const SAVED_OBJECT_TELEMETRY = 'monitoring-telemetry';

export const TELEMETRY_METRIC_BUTTON_CLICK = 'btnclick__';

export type INDEX_PATTERN_TYPES =
  | 'elasticsearch'
  | 'kibana'
  | 'logstash'
  | 'beats'
  | 'enterprisesearch';

export type DS_INDEX_PATTERN_TYPES = typeof DS_INDEX_PATTERN_METRICS | typeof DS_INDEX_PATTERN_LOGS;
