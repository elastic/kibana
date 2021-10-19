/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformConfigSchema } from './transforms/types';
import { ENABLE_CASE_CONNECTOR } from '../../cases/common';
import { METADATA_TRANSFORMS_PATTERN } from './endpoint/constants';

export const APP_ID = 'securitySolution';
export const CASES_FEATURE_ID = 'securitySolutionCases';
export const SERVER_APP_ID = 'siem';
export const APP_NAME = 'Security';
export const APP_ICON = 'securityAnalyticsApp';
export const APP_ICON_SOLUTION = 'logoSecurity';
export const APP_PATH = `/app/security`;
export const ADD_DATA_PATH = `/app/integrations/browse/security`;
export const DEFAULT_BYTES_FORMAT = 'format:bytes:defaultPattern';
export const DEFAULT_DATE_FORMAT = 'dateFormat';
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz';
export const DEFAULT_DARK_MODE = 'theme:darkMode';
export const DEFAULT_INDEX_KEY = 'securitySolution:defaultIndex';
export const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';
export const DEFAULT_TIME_RANGE = 'timepicker:timeDefaults';
export const DEFAULT_REFRESH_RATE_INTERVAL = 'timepicker:refreshIntervalDefaults';
export const DEFAULT_APP_TIME_RANGE = 'securitySolution:timeDefaults';
export const DEFAULT_APP_REFRESH_INTERVAL = 'securitySolution:refreshIntervalDefaults';
export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts';
export const DEFAULT_SIGNALS_INDEX = '.siem-signals';
export const DEFAULT_LISTS_INDEX = '.lists';
export const DEFAULT_ITEMS_INDEX = '.items';
// The DEFAULT_MAX_SIGNALS value exists also in `x-pack/plugins/cases/common/constants.ts`
// If either changes, engineer should ensure both values are updated
export const DEFAULT_MAX_SIGNALS = 100;
export const DEFAULT_SEARCH_AFTER_PAGE_SIZE = 100;
export const DEFAULT_ANOMALY_SCORE = 'securitySolution:defaultAnomalyScore';
export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000;
export const DEFAULT_SCALE_DATE_FORMAT = 'dateFormat:scaled';
export const DEFAULT_FROM = 'now/d';
export const DEFAULT_TO = 'now/d';
export const DEFAULT_INTERVAL_PAUSE = true;
export const DEFAULT_INTERVAL_TYPE = 'manual';
export const DEFAULT_INTERVAL_VALUE = 300000; // ms
export const DEFAULT_TIMEPICKER_QUICK_RANGES = 'timepicker:quickRanges';
export const DEFAULT_TRANSFORMS = 'securitySolution:transforms';
export const SCROLLING_DISABLED_CLASS_NAME = 'scrolling-disabled';
export const GLOBAL_HEADER_HEIGHT = 96; // px
export const GLOBAL_HEADER_HEIGHT_WITH_GLOBAL_BANNER = 128; // px
export const FILTERS_GLOBAL_HEIGHT = 109; // px
export const FULL_SCREEN_TOGGLED_CLASS_NAME = 'fullScreenToggled';
export const NO_ALERT_INDEX = 'no-alert-index-049FC71A-4C2C-446F-9901-37XMC5024C51';
export const ENDPOINT_METADATA_INDEX = 'metrics-endpoint.metadata-*';
export const DEFAULT_RULE_REFRESH_INTERVAL_ON = true;
export const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000; // ms
export const DEFAULT_RULE_REFRESH_IDLE_VALUE = 2700000; // ms
export const DEFAULT_RULE_NOTIFICATION_QUERY_SIZE = 100;
export const SECURITY_FEATURE_ID = 'Security';
export const DEFAULT_SPACE_ID = 'default';

// Document path where threat indicator fields are expected. Fields are used
// to enrich signals, and are copied to threat.enrichments.
export const DEFAULT_INDICATOR_SOURCE_PATH = 'threat.indicator';
export const ENRICHMENT_DESTINATION_PATH = 'threat.enrichments';
export const DEFAULT_THREAT_INDEX_KEY = 'securitySolution:defaultThreatIndex';
export const DEFAULT_THREAT_INDEX_VALUE = ['logs-ti_*'];
export const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d"';

export enum SecurityPageName {
  administration = 'administration',
  alerts = 'alerts',
  authentications = 'authentications',
  case = 'case',
  caseConfigure = 'case-configure',
  caseCreate = 'case-create',
  detections = 'detections',
  endpoints = 'endpoints',
  eventFilters = 'event_filters',
  hostIsolationExceptions = 'host_isolation_exceptions',
  events = 'events',
  exceptions = 'exceptions',
  explore = 'explore',
  hosts = 'hosts',
  hostsAnomalies = 'hosts-anomalies',
  hostsExternalAlerts = 'hosts-external_alerts',
  investigate = 'investigate',
  network = 'network',
  networkAnomalies = 'network-anomalies',
  networkDns = 'network-dns',
  networkExternalAlerts = 'network-external_alerts',
  networkHttp = 'network-http',
  networkTls = 'network-tls',
  timelines = 'timelines',
  timelinesTemplates = 'timelines-templates',
  overview = 'overview',
  policies = 'policies',
  rules = 'rules',
  trustedApps = 'trusted_apps',
  ueba = 'ueba',
  uncommonProcesses = 'uncommon_processes',
}

export const TIMELINES_PATH = '/timelines';
export const CASES_PATH = '/cases';
export const OVERVIEW_PATH = '/overview';
export const DETECTIONS_PATH = '/detections';
export const ALERTS_PATH = '/alerts';
export const RULES_PATH = '/rules';
export const EXCEPTIONS_PATH = '/exceptions';
export const HOSTS_PATH = '/hosts';
export const UEBA_PATH = '/ueba';
export const NETWORK_PATH = '/network';
export const MANAGEMENT_PATH = '/administration';
export const ENDPOINTS_PATH = `${MANAGEMENT_PATH}/endpoints`;
export const TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/trusted_apps`;
export const EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/event_filters`;
export const HOST_ISOLATION_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/host_isolation_exceptions`;

export const APP_OVERVIEW_PATH = `${APP_PATH}${OVERVIEW_PATH}`;
export const APP_MANAGEMENT_PATH = `${APP_PATH}${MANAGEMENT_PATH}`;

export const APP_ALERTS_PATH = `${APP_PATH}${ALERTS_PATH}`;
export const APP_RULES_PATH = `${APP_PATH}${RULES_PATH}`;
export const APP_EXCEPTIONS_PATH = `${APP_PATH}${EXCEPTIONS_PATH}`;

export const APP_HOSTS_PATH = `${APP_PATH}${HOSTS_PATH}`;
export const APP_UEBA_PATH = `${APP_PATH}${UEBA_PATH}`;
export const APP_NETWORK_PATH = `${APP_PATH}${NETWORK_PATH}`;
export const APP_TIMELINES_PATH = `${APP_PATH}${TIMELINES_PATH}`;
export const APP_CASES_PATH = `${APP_PATH}${CASES_PATH}`;
export const APP_ENDPOINTS_PATH = `${APP_PATH}${ENDPOINTS_PATH}`;
export const APP_TRUSTED_APPS_PATH = `${APP_PATH}${TRUSTED_APPS_PATH}`;
export const APP_EVENT_FILTERS_PATH = `${APP_PATH}${EVENT_FILTERS_PATH}`;
export const APP_HOST_ISOLATION_EXCEPTIONS_PATH = `${APP_PATH}${HOST_ISOLATION_EXCEPTIONS_PATH}`;

/** The comma-delimited list of Elasticsearch indices from which the SIEM app collects events */
export const DEFAULT_INDEX_PATTERN = [
  'apm-*-transaction*',
  'traces-apm*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
];

export const DEFAULT_INDEX_PATTERN_EXPERIMENTAL = [
  // TODO: Steph/ueba TEMP for testing UEBA data
  'ml_host_risk_score_*',
];

/** This Kibana Advanced Setting enables the `Security news` feed widget */
export const ENABLE_NEWS_FEED_SETTING = 'securitySolution:enableNewsFeed';

/** This Kibana Advanced Setting sets the auto refresh interval for the detections all rules table */
export const DEFAULT_RULES_TABLE_REFRESH_SETTING = 'securitySolution:rulesTableRefresh';

/** This Kibana Advanced Setting specifies the URL of the News feed widget */
export const NEWS_FEED_URL_SETTING = 'securitySolution:newsFeedUrl';

/** The default value for News feed widget */
export const NEWS_FEED_URL_SETTING_DEFAULT = 'https://feeds.elastic.co/security-solution';

/** This Kibana Advanced Setting specifies the URLs of `IP Reputation Links`*/
export const IP_REPUTATION_LINKS_SETTING = 'securitySolution:ipReputationLinks';

/** The default value for `IP Reputation Links` */
export const IP_REPUTATION_LINKS_SETTING_DEFAULT = `[
  { "name": "virustotal.com", "url_template": "https://www.virustotal.com/gui/search/{{ip}}" },
  { "name": "talosIntelligence.com", "url_template": "https://talosintelligence.com/reputation_center/lookup?search={{ip}}" }
]`;

/** The default settings for the transforms */
export const defaultTransformsSetting: TransformConfigSchema = {
  enabled: false,
  auto_start: true,
  auto_create: true,
  query: {
    range: {
      '@timestamp': {
        gte: 'now-1d/d',
        format: 'strict_date_optional_time',
      },
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: '1w',
    },
  },
  max_page_search_size: 5000,
  settings: [
    {
      prefix: 'all',
      indices: ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
      data_sources: [
        ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
      ],
    },
  ],
};
export const DEFAULT_TRANSFORMS_SETTING = JSON.stringify(defaultTransformsSetting, null, 2);

/**
 * Id for the signals alerting type
 */
export const SIGNALS_ID = `siem.signals` as const;

/**
 * IDs for RAC rule types
 */
const RULE_TYPE_PREFIX = `siem` as const;
export const EQL_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.eqlRule` as const;
export const INDICATOR_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.indicatorRule` as const;
export const ML_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.mlRule` as const;
export const QUERY_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.queryRule` as const;
export const THRESHOLD_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.thresholdRule` as const;

/**
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications`;

/**
 * Special internal structure for tags for signals. This is used
 * to filter out tags that have internal structures within them.
 */
export const INTERNAL_IDENTIFIER = '__internal';
export const INTERNAL_RULE_ID_KEY = `${INTERNAL_IDENTIFIER}_rule_id`;
export const INTERNAL_RULE_ALERT_ID_KEY = `${INTERNAL_IDENTIFIER}_rule_alert_id`;
export const INTERNAL_IMMUTABLE_KEY = `${INTERNAL_IDENTIFIER}_immutable`;

/**
 * Detection engine routes
 */
export const DETECTION_ENGINE_URL = '/api/detection_engine';
export const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules`;
export const DETECTION_ENGINE_PREPACKAGED_URL = `${DETECTION_ENGINE_RULES_URL}/prepackaged`;
export const DETECTION_ENGINE_PRIVILEGES_URL = `${DETECTION_ENGINE_URL}/privileges`;
export const DETECTION_ENGINE_INDEX_URL = `${DETECTION_ENGINE_URL}/index`;
export const DETECTION_ENGINE_TAGS_URL = `${DETECTION_ENGINE_URL}/tags`;
export const DETECTION_ENGINE_RULES_STATUS_URL = `${DETECTION_ENGINE_RULES_URL}/_find_statuses`;
export const DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL = `${DETECTION_ENGINE_RULES_URL}/prepackaged/_status`;
export const DETECTION_ENGINE_RULES_BULK_ACTION = `${DETECTION_ENGINE_RULES_URL}/_bulk_action`;

export const TIMELINE_RESOLVE_URL = '/api/timeline/resolve';
export const TIMELINE_URL = '/api/timeline';
export const TIMELINES_URL = '/api/timelines';
export const TIMELINE_FAVORITE_URL = '/api/timeline/_favorite';
export const TIMELINE_DRAFT_URL = `${TIMELINE_URL}/_draft`;
export const TIMELINE_EXPORT_URL = `${TIMELINE_URL}/_export`;
export const TIMELINE_IMPORT_URL = `${TIMELINE_URL}/_import`;
export const TIMELINE_PREPACKAGED_URL = `${TIMELINE_URL}/_prepackaged`;

export const NOTE_URL = '/api/note';
export const PINNED_EVENT_URL = '/api/pinned_event';

/**
 * Default signals index key for kibana.dev.yml
 */
export const SIGNALS_INDEX_KEY = 'signalsIndex';

export const DETECTION_ENGINE_SIGNALS_URL = `${DETECTION_ENGINE_URL}/signals`;
export const DETECTION_ENGINE_SIGNALS_STATUS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/status`;
export const DETECTION_ENGINE_QUERY_SIGNALS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/search`;
export const DETECTION_ENGINE_SIGNALS_MIGRATION_URL = `${DETECTION_ENGINE_SIGNALS_URL}/migration`;
export const DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/migration_status`;
export const DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL = `${DETECTION_ENGINE_SIGNALS_URL}/finalize_migration`;

export const ALERTS_AS_DATA_URL = '/internal/rac/alerts';
export const ALERTS_AS_DATA_FIND_URL = `${ALERTS_AS_DATA_URL}/find`;

/**
 * Common naming convention for an unauthenticated user
 */
export const UNAUTHENTICATED_USER = 'Unauthenticated';

/*
  Licensing requirements
 */
export const MINIMUM_ML_LICENSE = 'platinum';

/*
  Machine Learning constants
 */
export const ML_GROUP_ID = 'security';
export const LEGACY_ML_GROUP_ID = 'siem';
export const ML_GROUP_IDS = [ML_GROUP_ID, LEGACY_ML_GROUP_ID];

/*
  Rule notifications options
*/
export const NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS = [
  '.email',
  '.slack',
  '.pagerduty',
  '.swimlane',
  '.webhook',
  '.servicenow',
  '.servicenow-sir',
  '.jira',
  '.resilient',
  '.teams',
];

if (ENABLE_CASE_CONNECTOR) {
  NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS.push('.case');
}

export const NOTIFICATION_THROTTLE_NO_ACTIONS = 'no_actions';
export const NOTIFICATION_THROTTLE_RULE = 'rule';

export const showAllOthersBucket: string[] = [
  'destination.ip',
  'event.action',
  'event.category',
  'event.dataset',
  'event.module',
  'signal.rule.threat.tactic.name',
  'source.ip',
  'destination.ip',
  'user.name',
];

/**
 * Used for transforms for metrics_entities. If the security_solutions pulls in
 * the metrics_entities plugin, then it should pull this constant from there rather
 * than use it from here.
 */
export const ELASTIC_NAME = 'estc';

export const METADATA_TRANSFORM_STATS_URL = `/api/transform/transforms/${METADATA_TRANSFORMS_PATTERN}/_stats`;

export const RISKY_HOSTS_INDEX_PREFIX = 'ml_host_risk_score_latest_';

export const TRANSFORM_STATES = {
  ABORTING: 'aborting',
  FAILED: 'failed',
  INDEXING: 'indexing',
  STARTED: 'started',
  STOPPED: 'stopped',
  STOPPING: 'stopping',
  WAITING: 'waiting',
};

export const WARNING_TRANSFORM_STATES = new Set([
  TRANSFORM_STATES.ABORTING,
  TRANSFORM_STATES.FAILED,
  TRANSFORM_STATES.STOPPED,
  TRANSFORM_STATES.STOPPING,
]);
