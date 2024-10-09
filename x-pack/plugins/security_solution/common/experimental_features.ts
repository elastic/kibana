/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = { [K in keyof typeof allowedExperimentalValues]: boolean };

/**
 * A list of allowed values that can be used in `xpack.securitySolution.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  // FIXME:PT delete?
  excludePoliciesInFilterEnabled: false,

  kubernetesEnabled: true,
  donutChartEmbeddablesEnabled: false, // Depends on https://github.com/elastic/kibana/issues/136409 item 2 - 6

  /**
   * This is used for enabling the end-to-end tests for the security_solution telemetry.
   * We disable the telemetry since we don't have specific roles or permissions around it and
   * we don't want people to be able to violate security by getting access to whole documents
   * around telemetry they should not.
   * @see telemetry_detection_rules_preview_route.ts
   * @see test/security_solution_api_integration/test_suites/telemetry/README.md
   */
  previewTelemetryUrlEnabled: false,

  /**
   * Enables extended rule execution logging to Event Log. When this setting is enabled:
   * - Rules write their console error, info, debug, and trace messages to Event Log,
   *   in addition to other events they log there (status changes and execution metrics).
   * - We add a Kibana Advanced Setting that controls this behavior (on/off and log level).
   * - We show a table with plain execution logs on the Rule Details page.
   */
  extendedRuleExecutionLoggingEnabled: false,

  /**
   * Enables the SOC trends timerange and stats on D&R page
   */
  socTrendsEnabled: false,

  /**
   * Enables the `upload` endpoint response action (v8.9)
   */
  responseActionUploadEnabled: true,

  /**
   * Enables Automated Endpoint Process actions
   */
  automatedProcessActionsEnabled: true,

  /**
   * Temporary feature flag to enable the Response Actions in Rules UI - intermediate release
   */
  automatedResponseActionsForAllRulesEnabled: false,

  /**
   * Enables the ability to send Response actions to SentinelOne and persist the results
   * in ES. Adds API changes to support `agentType` and supports `isolate` and `release`
   * response actions in Response Console.
   *
   * Release: v8.13.0
   */
  responseActionsSentinelOneV1Enabled: true,

  /**
   * Enables use of SentinelOne response actions that complete asynchronously
   *
   * Release: v8.14.0
   */
  responseActionsSentinelOneV2Enabled: true,

  /** Enables the `get-file` response action for SentinelOne */
  responseActionsSentinelOneGetFileEnabled: true,

  /** Enables the `kill-process` response action for SentinelOne */
  responseActionsSentinelOneKillProcessEnabled: true,

  /** Enable the `processes` response actions for SentinelOne */
  responseActionsSentinelOneProcessesEnabled: true,

  /**
   * Enables the ability to send Response actions to Crowdstrike and persist the results
   * in ES.
   */
  responseActionsCrowdstrikeManualHostIsolationEnabled: true,

  /**
   * Space awareness for Elastic Defend management.
   * Feature depends on Fleet's corresponding features also being enabled:
   * - `subfeaturePrivileges`
   * - `useSpaceAwareness`
   * and Fleet must set it runtime mode to spaces by calling the following API:
   * - `POST /internal/fleet/enable_space_awareness`
   */
  endpointManagementSpaceAwarenessEnabled: false,

  /**
   * Enables new notes
   */
  securitySolutionNotesEnabled: false,

  /**
   * Disables entity and alert previews
   */
  entityAlertPreviewDisabled: false,

  /**
   * Enables the Assistant Model Evaluation advanced setting and API endpoint, introduced in `8.11.0`.
   */
  assistantModelEvaluation: false,

  /**
   * Enables new Knowledge Base Entries features, introduced in `8.15.0`.
   */
  assistantKnowledgeBaseByDefault: false,

  /**
   * Enables the Managed User section inside the new user details flyout.
   */
  newUserDetailsFlyoutManagedUser: false,

  /**
   * Enable risk engine client and initialisation of datastream, component templates and mappings
   */
  riskScoringPersistence: true,

  /**
   * Enables experimental Entity Analytics HTTP endpoints
   */
  riskScoringRoutesEnabled: true,

  /**
   * disables ES|QL rules
   */
  esqlRulesDisabled: false,

  /**
   * enables logging requests during rule preview
   */
  loggingRequestsEnabled: false,

  /**
   * Enables Protection Updates tab in the Endpoint Policy Details page
   */
  protectionUpdatesEnabled: true,

  /**
   * Disables the timeline save tour.
   * This flag is used to disable the tour in cypress tests.
   */
  disableTimelineSaveTour: false,

  /**
   * Enables the risk engine privileges route
   * and associated callout in the UI
   */
  riskEnginePrivilegesRouteEnabled: true,

  /**
   * Enables experimental Experimental S1 integration data to be available in Analyzer
   */
  sentinelOneDataInAnalyzerEnabled: true,

  /**
   * Enables SentinelOne manual host isolation response actions directly through the connector
   * sub-actions framework.
   * v8.12.0
   */
  sentinelOneManualHostActionsEnabled: true,

  /**
   * Enables experimental Crowdstrike integration data to be available in Analyzer
   */
  crowdstrikeDataInAnalyzerEnabled: true,

  /**
   * Enables Response actions telemetry collection
   * Should be enabled in 8.17.0
   */
  responseActionsTelemetryEnabled: false,

  /**
   * Enables experimental JAMF integration data to be available in Analyzer
   */
  jamfDataInAnalyzerEnabled: true,

  /*
   * Disables discover esql tab within timeline
   *
   */
  timelineEsqlTabDisabled: false,
  /*
   * Disables experimental Discover components, UnifiedFieldList and UnifiedDataTable in Timeline.
   */
  unifiedComponentsInTimelineDisabled: false,

  /*
   * Disables date pickers and sourcerer in analyzer if needed.
   *
   */
  analyzerDatePickersAndSourcererDisabled: false,

  /**
   * Enables an ability to customize Elastic prebuilt rules.
   *
   * Ticket: https://github.com/elastic/kibana/issues/174168
   * Owners: https://github.com/orgs/elastic/teams/security-detection-rule-management
   * Added: on Jun 24, 2024 in https://github.com/elastic/kibana/pull/186823
   * Turned: TBD
   * Expires: TBD
   */
  prebuiltRulesCustomizationEnabled: false,

  /**
   * Makes Elastic Defend integration's Malware On-Write Scan option available to edit.
   */
  malwareOnWriteScanOptionAvailable: true,

  /**
   * Enables unified manifest that replaces existing user artifacts manifest SO with a new approach of creating a SO per package policy.
   */
  unifiedManifestEnabled: true,

  /**
   * Enables the new modal for the value list items
   */
  valueListItemsModalEnabled: true,

  /**
   * Adds a new option to filter descendants of a process for Management / Event Filters
   */
  filterProcessDescendantsForEventFiltersEnabled: true,

  /**
   * Enables the new data ingestion hub
   */
  dataIngestionHubEnabled: false,

  /**
   * Enables the new Entity Store engine routes
   */
  entityStoreEnabled: false,
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.securitySolution.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];

  for (const value of configValue) {
    if (!allowedKeys.includes(value as keyof ExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ExperimentalFeatures] = true;
    }
  }

  return {
    features: {
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
