/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
export const ADD_THREAT_INTELLIGENCE_DATA_PATH = `/app/integrations/browse/threat_intel`;
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
export const DEFAULT_PREVIEW_INDEX = '.preview.alerts-security.alerts' as const;
export const DEFAULT_LISTS_INDEX = '.lists' as const;
export const DEFAULT_ITEMS_INDEX = '.items' as const;
// The DEFAULT_MAX_SIGNALS value exists also in `x-pack/plugins/cases/common/constants.ts`
// If either changes, engineer should ensure both values are updated
export const DEFAULT_MAX_SIGNALS = 100 as const;
export const DEFAULT_SEARCH_AFTER_PAGE_SIZE = 100 as const;
export const DEFAULT_ANOMALY_SCORE = 'securitySolution:defaultAnomalyScore' as const;
export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000 as const;
export const DEFAULT_FROM = 'now/d' as const;
export const DEFAULT_TO = 'now/d' as const;
export const DEFAULT_INTERVAL_PAUSE = true as const;
export const DEFAULT_INTERVAL_TYPE = 'manual' as const;
export const DEFAULT_INTERVAL_VALUE = 300000 as const; // ms
export const DEFAULT_TIMEPICKER_QUICK_RANGES = 'timepicker:quickRanges' as const;
export const SCROLLING_DISABLED_CLASS_NAME = 'scrolling-disabled' as const;
export const FULL_SCREEN_TOGGLED_CLASS_NAME = 'fullScreenToggled' as const;
export const NO_ALERT_INDEX = 'no-alert-index-049FC71A-4C2C-446F-9901-37XMC5024C51' as const;
export const ENDPOINT_METADATA_INDEX = 'metrics-endpoint.metadata-*' as const;
export const DEFAULT_RULE_REFRESH_INTERVAL_ON = true as const;
export const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000 as const; // ms
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
export const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d/d"' as const;

export enum SecurityPageName {
  administration = 'administration',
  alerts = 'alerts',
  blocklist = 'blocklist',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All Cases page names must match `CasesDeepLinkId` in x-pack/plugins/cases/public/common/navigation/deep_links.ts
   */
  case = 'cases', // must match `CasesDeepLinkId.cases`
  caseConfigure = 'cases_configure', // must match `CasesDeepLinkId.casesConfigure`
  caseCreate = 'cases_create', // must match `CasesDeepLinkId.casesCreate`
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All cloud security posture page names must match `CloudSecurityPosturePageId` in x-pack/plugins/cloud_security_posture/public/common/navigation/types.ts
   */
  cloudSecurityPostureBenchmarks = 'cloud_security_posture-benchmarks',
  cloudSecurityPostureDashboard = 'cloud_security_posture-dashboard',
  cloudSecurityPostureFindings = 'cloud_security_posture-findings',
  cloudSecurityPostureRules = 'cloud_security_posture-rules',
  dashboardsLanding = 'dashboards',
  detections = 'detections',
  detectionAndResponse = 'detection_response',
  endpoints = 'endpoints',
  eventFilters = 'event_filters',
  exceptions = 'exceptions',
  exploreLanding = 'explore',
  hostIsolationExceptions = 'host_isolation_exceptions',
  hosts = 'hosts',
  hostsAnomalies = 'hosts-anomalies',
  hostsRisk = 'hosts-risk',
  hostsEvents = 'hosts-events',
  investigate = 'investigate',
  kubernetes = 'kubernetes',
  landing = 'get_started',
  network = 'network',
  networkAnomalies = 'network-anomalies',
  networkDns = 'network-dns',
  networkEvents = 'network-events',
  networkHttp = 'network-http',
  networkTls = 'network-tls',
  noPage = '',
  overview = 'overview',
  policies = 'policy',
  responseActionsHistory = 'response_actions_history',
  rules = 'rules',
  rulesCreate = 'rules-create',
  sessions = 'sessions',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * All threat intelligence page names must match `TIPageId` in x-pack/plugins/threat_intelligence/public/common/navigation/types.ts
   */
  threatIntelligenceIndicators = 'threat_intelligence-indicators',
  timelines = 'timelines',
  timelinesTemplates = 'timelines-templates',
  trustedApps = 'trusted_apps',
  uncommonProcesses = 'uncommon_processes',
  users = 'users',
  usersAnomalies = 'users-anomalies',
  usersAuthentications = 'users-authentications',
  usersEvents = 'users-events',
  usersRisk = 'users-risk',
  entityAnalytics = 'entity-analytics',
}

export const EXPLORE_PATH = '/explore' as const;
export const DASHBOARDS_PATH = '/dashboards' as const;
export const MANAGE_PATH = '/manage' as const;
export const TIMELINES_PATH = '/timelines' as const;
export const CASES_PATH = '/cases' as const;
export const OVERVIEW_PATH = '/overview' as const;
export const LANDING_PATH = '/get_started' as const;
export const DETECTION_RESPONSE_PATH = '/detection_response' as const;
export const DETECTIONS_PATH = '/detections' as const;
export const ALERTS_PATH = '/alerts' as const;
export const RULES_PATH = '/rules' as const;
export const RULES_CREATE_PATH = `${RULES_PATH}/create` as const;
export const EXCEPTIONS_PATH = '/exceptions' as const;
export const HOSTS_PATH = '/hosts' as const;
export const USERS_PATH = '/users' as const;
export const KUBERNETES_PATH = '/kubernetes' as const;
export const NETWORK_PATH = '/network' as const;
export const MANAGEMENT_PATH = '/administration' as const;
export const THREAT_INTELLIGENCE_PATH = '/threat_intelligence' as const;
export const ENDPOINTS_PATH = `${MANAGEMENT_PATH}/endpoints` as const;
export const POLICIES_PATH = `${MANAGEMENT_PATH}/policy` as const;
export const TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/trusted_apps` as const;
export const EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/event_filters` as const;
export const HOST_ISOLATION_EXCEPTIONS_PATH =
  `${MANAGEMENT_PATH}/host_isolation_exceptions` as const;
export const BLOCKLIST_PATH = `${MANAGEMENT_PATH}/blocklist` as const;
export const RESPONSE_ACTIONS_HISTORY_PATH = `${MANAGEMENT_PATH}/response_actions_history` as const;
export const ENTITY_ANALYTICS_PATH = '/entity_analytics' as const;
export const APP_OVERVIEW_PATH = `${APP_PATH}${OVERVIEW_PATH}` as const;
export const APP_LANDING_PATH = `${APP_PATH}${LANDING_PATH}` as const;
export const APP_DETECTION_RESPONSE_PATH = `${APP_PATH}${DETECTION_RESPONSE_PATH}` as const;
export const APP_MANAGEMENT_PATH = `${APP_PATH}${MANAGEMENT_PATH}` as const;

export const APP_ALERTS_PATH = `${APP_PATH}${ALERTS_PATH}` as const;
export const APP_RULES_PATH = `${APP_PATH}${RULES_PATH}` as const;
export const APP_EXCEPTIONS_PATH = `${APP_PATH}${EXCEPTIONS_PATH}` as const;

export const APP_HOSTS_PATH = `${APP_PATH}${HOSTS_PATH}` as const;
export const APP_USERS_PATH = `${APP_PATH}${USERS_PATH}` as const;
export const APP_NETWORK_PATH = `${APP_PATH}${NETWORK_PATH}` as const;
export const APP_KUBERNETES_PATH = `${APP_PATH}${KUBERNETES_PATH}` as const;
export const APP_TIMELINES_PATH = `${APP_PATH}${TIMELINES_PATH}` as const;
export const APP_CASES_PATH = `${APP_PATH}${CASES_PATH}` as const;
export const APP_ENDPOINTS_PATH = `${APP_PATH}${ENDPOINTS_PATH}` as const;
export const APP_POLICIES_PATH = `${APP_PATH}${POLICIES_PATH}` as const;
export const APP_TRUSTED_APPS_PATH = `${APP_PATH}${TRUSTED_APPS_PATH}` as const;
export const APP_EVENT_FILTERS_PATH = `${APP_PATH}${EVENT_FILTERS_PATH}` as const;
export const APP_HOST_ISOLATION_EXCEPTIONS_PATH =
  `${APP_PATH}${HOST_ISOLATION_EXCEPTIONS_PATH}` as const;
export const APP_BLOCKLIST_PATH = `${APP_PATH}${BLOCKLIST_PATH}` as const;
export const APP_RESPONSE_ACTIONS_HISTORY_PATH =
  `${APP_PATH}${RESPONSE_ACTIONS_HISTORY_PATH}` as const;
export const APP_ENTITY_ANALYTICS_PATH = `${APP_PATH}${ENTITY_ANALYTICS_PATH}` as const;

// cloud logs to exclude from default index pattern
export const EXCLUDE_ELASTIC_CLOUD_INDICES = ['-*elastic-cloud-logs-*'];

/** The comma-delimited list of Elasticsearch indices from which the SIEM app collects events */
export const INCLUDE_INDEX_PATTERN = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
];
/** The comma-delimited list of Elasticsearch indices from which the SIEM app collects events, and the exclude index pattern */
export const DEFAULT_INDEX_PATTERN = [...INCLUDE_INDEX_PATTERN, ...EXCLUDE_ELASTIC_CLOUD_INDICES];

/** This Kibana Advanced Setting enables the grouped navigation in Security Solution */
export const ENABLE_GROUPED_NAVIGATION = 'securitySolution:enableGroupedNav' as const;

/** This Kibana Advanced Setting enables the `Security news` feed widget */
export const ENABLE_NEWS_FEED_SETTING = 'securitySolution:enableNewsFeed' as const;

/** This Kibana Advanced Setting enables the warnings for CCS read permissions */
export const ENABLE_CCS_READ_WARNING_SETTING = 'securitySolution:enableCcsWarning' as const;

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

/** This Kibana Advanced Setting shows related integrations on the Rules Table */
export const SHOW_RELATED_INTEGRATIONS_SETTING =
  'securitySolution:showRelatedIntegrations' as const;

/** This Kibana Advanced Setting enables extended rule execution logging to Event Log */
export const EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING =
  'securitySolution:extendedRuleExecutionLoggingEnabled' as const;

/** This Kibana Advanced Setting sets minimum log level starting from which execution logs will be written to Event Log */
export const EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING =
  'securitySolution:extendedRuleExecutionLoggingMinLevel' as const;

/**
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications` as const;

/**
 * Internal actions route
 */
export const UPDATE_OR_CREATE_LEGACY_ACTIONS = '/internal/api/detection/legacy/notifications';

/**
 * Detection engine routes
 */
export const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
export const DETECTION_ENGINE_PRIVILEGES_URL = `${DETECTION_ENGINE_URL}/privileges` as const;
export const DETECTION_ENGINE_INDEX_URL = `${DETECTION_ENGINE_URL}/index` as const;

export const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;
export const DETECTION_ENGINE_RULES_URL_FIND = `${DETECTION_ENGINE_RULES_URL}/_find` as const;
export const DETECTION_ENGINE_TAGS_URL = `${DETECTION_ENGINE_URL}/tags` as const;
export const DETECTION_ENGINE_RULES_BULK_ACTION =
  `${DETECTION_ENGINE_RULES_URL}/_bulk_action` as const;
export const DETECTION_ENGINE_RULES_PREVIEW = `${DETECTION_ENGINE_RULES_URL}/preview` as const;
export const DETECTION_ENGINE_RULES_BULK_DELETE =
  `${DETECTION_ENGINE_RULES_URL}/_bulk_delete` as const;
export const DETECTION_ENGINE_RULES_BULK_CREATE =
  `${DETECTION_ENGINE_RULES_URL}/_bulk_create` as const;
export const DETECTION_ENGINE_RULES_BULK_UPDATE =
  `${DETECTION_ENGINE_RULES_URL}/_bulk_update` as const;

export const INTERNAL_RISK_SCORE_URL = '/internal/risk_score' as const;
export const RISK_SCORE_RESTART_TRANSFORMS = `${INTERNAL_RISK_SCORE_URL}/transforms/restart`;
export const DEV_TOOL_PREBUILT_CONTENT =
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/dev_tool/{console_id}` as const;
export const devToolPrebuiltContentUrl = (spaceId: string, consoleId: string) =>
  `/s/${spaceId}${INTERNAL_RISK_SCORE_URL}/prebuilt_content/dev_tool/${consoleId}` as const;
export const PREBUILT_SAVED_OBJECTS_BULK_CREATE = `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_create/{template_name}`;
export const prebuiltSavedObjectsBulkCreateUrl = (templateName: string) =>
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_create/${templateName}` as const;
export const PREBUILT_SAVED_OBJECTS_BULK_DELETE = `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_delete/{template_name}`;
export const prebuiltSavedObjectsBulkDeleteUrl = (templateName: string) =>
  `${INTERNAL_RISK_SCORE_URL}/prebuilt_content/saved_objects/_bulk_delete/${templateName}` as const;
export const RISK_SCORE_CREATE_INDEX = `${INTERNAL_RISK_SCORE_URL}/indices/create`;
export const RISK_SCORE_DELETE_INDICES = `${INTERNAL_RISK_SCORE_URL}/indices/delete`;
export const RISK_SCORE_CREATE_STORED_SCRIPT = `${INTERNAL_RISK_SCORE_URL}/stored_scripts/create`;
export const RISK_SCORE_DELETE_STORED_SCRIPT = `${INTERNAL_RISK_SCORE_URL}/stored_scripts/delete`;
/**
 * Internal detection engine routes
 */
export const INTERNAL_DETECTION_ENGINE_URL = '/internal/detection_engine' as const;
export const DETECTION_ENGINE_ALERTS_INDEX_URL =
  `${INTERNAL_DETECTION_ENGINE_URL}/signal/index` as const;

/**
 * Telemetry detection endpoint for any previews requested of what data we are
 * providing through UI/UX and for e2e tests.
 *   curl http//localhost:5601/internal/security_solution/telemetry
 * to see the contents
 */
export const SECURITY_TELEMETRY_URL = `/internal/security_solution/telemetry` as const;

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
export const SOURCERER_API_URL = '/internal/security_solution/sourcerer' as const;
export const RISK_SCORE_INDEX_STATUS_API_URL = '/internal/risk_score/index_status' as const;

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

export const RISKY_HOSTS_INDEX_PREFIX = 'ml_host_risk_score_' as const;

export const RISKY_USERS_INDEX_PREFIX = 'ml_user_risk_score_' as const;

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

export const STARTED_TRANSFORM_STATES = new Set([
  TRANSFORM_STATES.INDEXING,
  TRANSFORM_STATES.STARTED,
]);

/**
 * How many rules to update at a time is set to 50 from errors coming from
 * the slow environments such as cloud when the rule updates are > 100 we were
 * seeing timeout issues.
 *
 * Since there is not timeout options at the alerting API level right now, we are
 * at the mercy of the Elasticsearch server client/server default timeouts and what
 * we are doing could be considered a workaround to not being able to increase the timeouts.
 *
 * However, other bad effects and saturation of connections beyond 50 makes this a "noisy neighbor"
 * if we don't limit its number of connections as we increase the number of rules that can be
 * installed at a time.
 *
 * Lastly, we saw weird issues where Chrome on upstream 408 timeouts will re-call the REST route
 * which in turn could create additional connections we want to avoid.
 *
 * See file import_rules_route.ts for another area where 50 was chosen, therefore I chose
 * 50 here to mimic it as well. If you see this re-opened or what similar to it, consider
 * reducing the 50 above to a lower number.
 *
 * See the original ticket here:
 * https://github.com/elastic/kibana/issues/94418
 */
export const MAX_RULES_TO_UPDATE_IN_PARALLEL = 50;

export const LIMITED_CONCURRENCY_ROUTE_TAG_PREFIX = `${APP_ID}:limitedConcurrency`;

/**
 * Max number of rules to display on UI in table, max number of rules that can be edited in a single bulk edit API request
 * We limit number of rules in bulk edit API, because rulesClient doesn't support bulkGet of rules by ids.
 * Given this limitation, current implementation fetches each rule separately through rulesClient.resolve method.
 * As max number of rules displayed on a page is 100, max 100 rules can be bulk edited by passing their ids to API.
 * We decided add this limit(number of ids less than 100) in bulk edit API as well, to prevent a huge number of single rule fetches
 */
export const RULES_TABLE_MAX_PAGE_SIZE = 100;
export const RULES_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, RULES_TABLE_MAX_PAGE_SIZE];

/**
 * Local storage keys we use to store the state of our new features tours we currently show in the app.
 *
 * NOTE: As soon as we want to show tours for new features in the upcoming release,
 * we will need to update these constants with the corresponding version.
 */
export const NEW_FEATURES_TOUR_STORAGE_KEYS = {
  RULE_MANAGEMENT_PAGE: 'securitySolution.rulesManagementPage.newFeaturesTour.v8.4',
};

export const RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY =
  'securitySolution.ruleDetails.ruleExecutionLog.showMetrics.v8.2';

// TODO: https://github.com/elastic/kibana/pull/142950
/**
 * Error codes that can be thrown during _bulk_action API dry_run call and be processed and displayed to end user
 */
export enum BulkActionsDryRunErrCode {
  IMMUTABLE = 'IMMUTABLE',
  MACHINE_LEARNING_AUTH = 'MACHINE_LEARNING_AUTH',
  MACHINE_LEARNING_INDEX_PATTERN = 'MACHINE_LEARNING_INDEX_PATTERN',
}

export const RISKY_HOSTS_DOC_LINK =
  'https://www.elastic.co/guide/en/security/current/host-risk-score.html';
export const RISKY_USERS_DOC_LINK =
  'https://www.elastic.co/guide/en/security/current/user-risk-score.html';
