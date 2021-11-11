/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformConfigSchema } from './transforms/types';
import { ENABLE_CASE_CONNECTOR } from '../../cases/common';
import { METADATA_TRANSFORMS_PATTERN } from './endpoint/constants';

/**
 * as const
 *
 * The const assertion ensures that type widening does not occur
 * https://mariusschulz.com/blog/literal-type-widening-in-typescript
 * Please follow this convention when adding to this file
 */

export const APP_ID = 'securitySolution' as const;
export const APP_UI_ID = 'securitySolutionUI' as const;
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const SERVER_APP_ID = 'siem' as const;
export const APP_NAME = 'Security' as const;
export const APP_ICON = 'securityAnalyticsApp' as const;
export const APP_ICON_SOLUTION = 'logoSecurity' as const;
export const APP_PATH = `/app/security` as const;
export const ADD_DATA_PATH = `/app/integrations/browse/security`;
export const DEFAULT_BYTES_FORMAT = 'format:bytes:defaultPattern' as const;
export const DEFAULT_DATE_FORMAT = 'dateFormat' as const;
export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;
export const DEFAULT_INDEX_KEY = 'securitySolution:defaultIndex' as const;
export const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern' as const;
export const DEFAULT_DATA_VIEW_ID = 'security-solution' as const;
export const DEFAULT_TIME_FIELD = '@timestamp' as const;
export const DEFAULT_TIME_RANGE = 'timepicker:timeDefaults' as const;
export const DEFAULT_REFRESH_RATE_INTERVAL = 'timepicker:refreshIntervalDefaults' as const;
export const DEFAULT_APP_TIME_RANGE = 'securitySolution:timeDefaults' as const;
export const DEFAULT_APP_REFRESH_INTERVAL = 'securitySolution:refreshIntervalDefaults' as const;
export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
export const DEFAULT_SIGNALS_INDEX = '.siem-signals' as const;
export const DEFAULT_PREVIEW_INDEX = '.siem-preview-signals' as const;
export const DEFAULT_LISTS_INDEX = '.lists' as const;
export const DEFAULT_ITEMS_INDEX = '.items' as const;
// The DEFAULT_MAX_SIGNALS value exists also in `x-pack/plugins/cases/common/constants.ts`
// If either changes, engineer should ensure both values are updated
export const DEFAULT_MAX_SIGNALS = 100 as const;
export const DEFAULT_SEARCH_AFTER_PAGE_SIZE = 100 as const;
export const DEFAULT_ANOMALY_SCORE = 'securitySolution:defaultAnomalyScore' as const;
export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000 as const;
export const DEFAULT_SCALE_DATE_FORMAT = 'dateFormat:scaled' as const;
export const DEFAULT_FROM = 'now/d' as const;
export const DEFAULT_TO = 'now/d' as const;
export const DEFAULT_INTERVAL_PAUSE = true as const;
export const DEFAULT_INTERVAL_TYPE = 'manual' as const;
export const DEFAULT_INTERVAL_VALUE = 300000 as const; // ms
export const DEFAULT_TIMEPICKER_QUICK_RANGES = 'timepicker:quickRanges' as const;
export const DEFAULT_TRANSFORMS = 'securitySolution:transforms' as const;
export const SCROLLING_DISABLED_CLASS_NAME = 'scrolling-disabled' as const;
export const GLOBAL_HEADER_HEIGHT = 96 as const; // px
export const FILTERS_GLOBAL_HEIGHT = 109 as const; // px
export const FULL_SCREEN_TOGGLED_CLASS_NAME = 'fullScreenToggled' as const;
export const NO_ALERT_INDEX = 'no-alert-index-049FC71A-4C2C-446F-9901-37XMC5024C51' as const;
export const ENDPOINT_METADATA_INDEX = 'metrics-endpoint.metadata-*' as const;
export const DEFAULT_RULE_REFRESH_INTERVAL_ON = true as const;
export const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000 as const; // ms
export const DEFAULT_RULE_REFRESH_IDLE_VALUE = 2700000 as const; // ms
export const DEFAULT_RULE_NOTIFICATION_QUERY_SIZE = 100 as const;
export const SECURITY_FEATURE_ID = 'Security' as const;
export const DEFAULT_SPACE_ID = 'default' as const;
export const DEFAULT_RELATIVE_DATE_THRESHOLD = 24 as const;

// Document path where threat indicator fields are expected. Fields are used
// to enrich signals, and are copied to threat.enrichments.
export const DEFAULT_INDICATOR_SOURCE_PATH = 'threat.indicator' as const;
export const ENRICHMENT_DESTINATION_PATH = 'threat.enrichments' as const;
export const DEFAULT_THREAT_INDEX_KEY = 'securitySolution:defaultThreatIndex' as const;
export const DEFAULT_THREAT_INDEX_VALUE = ['logs-ti_*'] as const;
export const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d"' as const;

export enum SecurityPageName {
  administration = 'administration',
  alerts = 'alerts',
  authentications = 'authentications',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * The 3 following Cases page names must match `CasesDeepLinkId` in x-pack/plugins/cases/public/common/navigation.ts
   */
  case = 'cases',
  caseConfigure = 'cases_configure',
  caseCreate = 'cases_create',
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

export const TIMELINES_PATH = '/timelines' as const;
export const CASES_PATH = '/cases' as const;
export const OVERVIEW_PATH = '/overview' as const;
export const DETECTIONS_PATH = '/detections' as const;
export const ALERTS_PATH = '/alerts' as const;
export const RULES_PATH = '/rules' as const;
export const EXCEPTIONS_PATH = '/exceptions' as const;
export const HOSTS_PATH = '/hosts' as const;
export const UEBA_PATH = '/ueba' as const;
export const NETWORK_PATH = '/network' as const;
export const MANAGEMENT_PATH = '/administration' as const;
export const ENDPOINTS_PATH = `${MANAGEMENT_PATH}/endpoints` as const;
export const TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/trusted_apps` as const;
export const EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/event_filters` as const;
export const HOST_ISOLATION_EXCEPTIONS_PATH =
  `${MANAGEMENT_PATH}/host_isolation_exceptions` as const;

export const APP_OVERVIEW_PATH = `${APP_PATH}${OVERVIEW_PATH}` as const;
export const APP_MANAGEMENT_PATH = `${APP_PATH}${MANAGEMENT_PATH}` as const;

export const APP_ALERTS_PATH = `${APP_PATH}${ALERTS_PATH}` as const;
export const APP_RULES_PATH = `${APP_PATH}${RULES_PATH}` as const;
export const APP_EXCEPTIONS_PATH = `${APP_PATH}${EXCEPTIONS_PATH}` as const;

export const APP_HOSTS_PATH = `${APP_PATH}${HOSTS_PATH}` as const;
export const APP_UEBA_PATH = `${APP_PATH}${UEBA_PATH}` as const;
export const APP_NETWORK_PATH = `${APP_PATH}${NETWORK_PATH}` as const;
export const APP_TIMELINES_PATH = `${APP_PATH}${TIMELINES_PATH}` as const;
export const APP_CASES_PATH = `${APP_PATH}${CASES_PATH}` as const;
export const APP_ENDPOINTS_PATH = `${APP_PATH}${ENDPOINTS_PATH}` as const;
export const APP_TRUSTED_APPS_PATH = `${APP_PATH}${TRUSTED_APPS_PATH}` as const;
export const APP_EVENT_FILTERS_PATH = `${APP_PATH}${EVENT_FILTERS_PATH}` as const;
export const APP_HOST_ISOLATION_EXCEPTIONS_PATH =
  `${APP_PATH}${HOST_ISOLATION_EXCEPTIONS_PATH}` as const;

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
export const ENABLE_NEWS_FEED_SETTING = 'securitySolution:enableNewsFeed' as const;

/** This Kibana Advanced Setting sets the auto refresh interval for the detections all rules table */
export const DEFAULT_RULES_TABLE_REFRESH_SETTING = 'securitySolution:rulesTableRefresh' as const;

/** This Kibana Advanced Setting specifies the URL of the News feed widget */
export const NEWS_FEED_URL_SETTING = 'securitySolution:newsFeedUrl' as const;

/** The default value for News feed widget */
export const NEWS_FEED_URL_SETTING_DEFAULT = 'https://feeds.elastic.co/security-solution' as const;

/** This Kibana Advanced Setting specifies the URLs of `IP Reputation Links`*/
export const IP_REPUTATION_LINKS_SETTING = 'securitySolution:ipReputationLinks' as const;

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
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications` as const;

/**
 * Special internal structure for tags for signals. This is used
 * to filter out tags that have internal structures within them.
 */
export const INTERNAL_IDENTIFIER = '__internal' as const;
export const INTERNAL_RULE_ID_KEY = `${INTERNAL_IDENTIFIER}_rule_id` as const;
export const INTERNAL_RULE_ALERT_ID_KEY = `${INTERNAL_IDENTIFIER}_rule_alert_id` as const;
export const INTERNAL_IMMUTABLE_KEY = `${INTERNAL_IDENTIFIER}_immutable` as const;

/**
 * Internal actions route
 */
export const UPDATE_OR_CREATE_LEGACY_ACTIONS = '/internal/api/detection/legacy/notifications';

/**
 * Detection engine routes
 */
export const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
export const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;
export const DETECTION_ENGINE_PREPACKAGED_URL =
  `${DETECTION_ENGINE_RULES_URL}/prepackaged` as const;
export const DETECTION_ENGINE_PRIVILEGES_URL = `${DETECTION_ENGINE_URL}/privileges` as const;
export const DETECTION_ENGINE_INDEX_URL = `${DETECTION_ENGINE_URL}/index` as const;
export const DETECTION_ENGINE_TAGS_URL = `${DETECTION_ENGINE_URL}/tags` as const;
export const DETECTION_ENGINE_RULES_STATUS_URL =
  `${DETECTION_ENGINE_RULES_URL}/_find_statuses` as const;
export const DETECTION_ENGINE_PREPACKAGED_RULES_STATUS_URL =
  `${DETECTION_ENGINE_RULES_URL}/prepackaged/_status` as const;
export const DETECTION_ENGINE_RULES_BULK_ACTION =
  `${DETECTION_ENGINE_RULES_URL}/_bulk_action` as const;
export const DETECTION_ENGINE_RULES_PREVIEW = `${DETECTION_ENGINE_RULES_URL}/preview` as const;
export const DETECTION_ENGINE_RULES_PREVIEW_INDEX_URL =
  `${DETECTION_ENGINE_RULES_PREVIEW}/index` as const;

/**
 * Internal detection engine routes
 */
export const INTERNAL_DETECTION_ENGINE_URL = '/internal/detection_engine' as const;
export const INTERNAL_DETECTION_ENGINE_RULE_STATUS_URL =
  `${INTERNAL_DETECTION_ENGINE_URL}/rules/_find_status` as const;

export const TIMELINE_RESOLVE_URL = '/api/timeline/resolve' as const;
export const TIMELINE_URL = '/api/timeline' as const;
export const TIMELINES_URL = '/api/timelines' as const;
export const TIMELINE_FAVORITE_URL = '/api/timeline/_favorite' as const;
export const TIMELINE_DRAFT_URL = `${TIMELINE_URL}/_draft` as const;
export const TIMELINE_EXPORT_URL = `${TIMELINE_URL}/_export` as const;
export const TIMELINE_IMPORT_URL = `${TIMELINE_URL}/_import` as const;
export const TIMELINE_PREPACKAGED_URL = `${TIMELINE_URL}/_prepackaged` as const;

export const NOTE_URL = '/api/note' as const;
export const PINNED_EVENT_URL = '/api/pinned_event' as const;
export const SOURCERER_API_URL = '/api/sourcerer' as const;

/**
 * Default signals index key for kibana.dev.yml
 */
export const SIGNALS_INDEX_KEY = 'signalsIndex' as const;

export const DETECTION_ENGINE_SIGNALS_URL = `${DETECTION_ENGINE_URL}/signals` as const;
export const DETECTION_ENGINE_SIGNALS_STATUS_URL =
  `${DETECTION_ENGINE_SIGNALS_URL}/status` as const;
export const DETECTION_ENGINE_QUERY_SIGNALS_URL = `${DETECTION_ENGINE_SIGNALS_URL}/search` as const;
export const DETECTION_ENGINE_SIGNALS_MIGRATION_URL =
  `${DETECTION_ENGINE_SIGNALS_URL}/migration` as const;
export const DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL =
  `${DETECTION_ENGINE_SIGNALS_URL}/migration_status` as const;
export const DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL =
  `${DETECTION_ENGINE_SIGNALS_URL}/finalize_migration` as const;

export const ALERTS_AS_DATA_URL = '/internal/rac/alerts' as const;
export const ALERTS_AS_DATA_FIND_URL = `${ALERTS_AS_DATA_URL}/find` as const;

/**
 * Common naming convention for an unauthenticated user
 */
export const UNAUTHENTICATED_USER = 'Unauthenticated' as const;

/*
  Licensing requirements
 */
export const MINIMUM_ML_LICENSE = 'platinum' as const;

/*
  Machine Learning constants
 */
export const ML_GROUP_ID = 'security' as const;
export const LEGACY_ML_GROUP_ID = 'siem' as const;
export const ML_GROUP_IDS = [ML_GROUP_ID, LEGACY_ML_GROUP_ID] as const;

/*
  Rule notifications options
*/
export const NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS = [
  '.email',
  '.index',
  '.jira',
  '.pagerduty',
  '.resilient',
  '.servicenow',
  '.servicenow-sir',
  '.servicenow-itom',
  '.slack',
  '.swimlane',
  '.teams',
  '.webhook',
];

if (ENABLE_CASE_CONNECTOR) {
  NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS.push('.case');
}

export const NOTIFICATION_THROTTLE_NO_ACTIONS = 'no_actions' as const;
export const NOTIFICATION_THROTTLE_RULE = 'rule' as const;

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
export const ELASTIC_NAME = 'estc' as const;

export const METADATA_TRANSFORM_STATS_URL = `/api/transform/transforms/${METADATA_TRANSFORMS_PATTERN}/_stats`;

export const RISKY_HOSTS_INDEX_PREFIX = 'ml_host_risk_score_latest_' as const;

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
