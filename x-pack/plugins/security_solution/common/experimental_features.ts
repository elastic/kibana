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
  tGridEnabled: true,
  tGridEventRenderedViewEnabled: true,

  // FIXME:PT delete?
  excludePoliciesInFilterEnabled: false,

  kubernetesEnabled: true,
  chartEmbeddablesEnabled: true,
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
   * Enables the insights module for related alerts by process ancestry
   */
  insightsRelatedAlertsByProcessAncestry: true,

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
   * Enables the automated response actions in rule + alerts
   */
  responseActionsEnabled: true,

  /**
   * Enables the automated endpoint response action in rule + alerts
   */
  endpointResponseActionsEnabled: true,

  /**
   * Enables the `upload` endpoint response action (v8.9)
   */
  responseActionUploadEnabled: true,

  /**
   * Enables Automated Endpoint Process actions
   */
  automatedProcessActionsEnabled: true,

  /**
   * Enables the ability to send Response actions to SentinelOne and persist the results
   * in ES. Adds API changes to support `agentType` and supports `isolate` and `release`
   * response actions in Response Console.
   *
   * Release: v8.13.0
   */
  responseActionsSentinelOneV1Enabled: true,

  /**
   * Enables use of SentinelOne response actions that complete asynchronously as well as support
   * for more response actions.
   */
  responseActionsSentinelOneV2Enabled: false,

  /**
   * Enables top charts on Alerts Page
   */
  alertsPageChartsEnabled: true,

  /**
   * Enables the alert type column in KPI visualizations on Alerts Page
   */
  alertTypeEnabled: false,

  /**
   * Enables expandable flyout in create rule page, alert preview
   */
  expandableFlyoutInCreateRuleEnabled: true,

  /**
   * Enables expandable flyout for event type documents
   */
  expandableEventFlyoutEnabled: false,

  /**
   * Enables expandable flyout in timeline
   */
  expandableTimelineFlyoutEnabled: false,
  /*

  /**
   * Enables new Set of filters on the Alerts page.
   */
  alertsPageFiltersEnabled: true,

  /**
   * Enables the Assistant Model Evaluation advanced setting and API endpoint, introduced in `8.11.0`.
   */
  assistantModelEvaluation: false,

  /**
   * Enables the new user details flyout displayed on the Alerts table.
   */
  newUserDetailsFlyout: true,

  /**
   * Enables the Managed User section inside the new user details flyout.
   * To see this section you also need newUserDetailsFlyout flag enabled.
   */
  newUserDetailsFlyoutManagedUser: false,

  /**
   * Enables the new host details flyout displayed on the Alerts table.
   */
  newHostDetailsFlyout: true,

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
   * Enables alerts suppression for new terms rules
   */
  alertSuppressionForNewTermsRuleEnabled: false,

  /*
   * Enables Entity Store POC
   */
  entityStoreEnabled: true,

  /*
   * Enables experimental Experimental S1 integration data to be available in Analyzer
   */
  sentinelOneDataInAnalyzerEnabled: true,

  /**
   * Enables SentinelOne manual host manipulation actions
   */
  sentinelOneManualHostActionsEnabled: true,

  /**
   * Enables experimental Crowdstrike integration data to be available in Analyzer
   */
  crowdstrikeDataInAnalyzerEnabled: false,

  /**
   * Enables experimental "Updates" tab in the prebuilt rule upgrade flyout.
   * This tab shows the JSON diff between the installed prebuilt rule
   * version and the latest available version.
   *
   * Ticket: https://github.com/elastic/kibana/issues/169160
   * Owners: https://github.com/orgs/elastic/teams/security-detection-rule-management
   * Added: on Dec 06, 2023 in https://github.com/elastic/kibana/pull/172535
   * Turned: on Dec 20, 2023 in https://github.com/elastic/kibana/pull/173368
   * Expires: on Feb 20, 2024
   */
  jsonPrebuiltRulesDiffingEnabled: true,
  /*
   * Disables discover esql tab within timeline
   *
   */
  timelineEsqlTabDisabled: false,
  /*
   * Enables Discover components, UnifiedFieldList and UnifiedDataTable in Timeline.
   */
  unifiedComponentsInTimelineEnabled: false,

  /*
   * Disables date pickers and sourcerer in analyzer if needed.
   *
   */
  analyzerDatePickersAndSourcererDisabled: false,

  /**
   * Enables per-field rule diffs tab in the prebuilt rule upgrade flyout
   *
   * Ticket: https://github.com/elastic/kibana/issues/166489
   * Owners: https://github.com/orgs/elastic/teams/security-detection-rule-management
   * Added: on Feb 12, 2024 in https://github.com/elastic/kibana/pull/174564
   * Turned: on Feb 23, 2024 in https://github.com/elastic/kibana/pull/177495
   * Expires: on Apr 23, 2024
   */
  perFieldPrebuiltRulesDiffingEnabled: true,

  /**
   * Makes Elastic Defend integration's Malware On-Write Scan option available to edit.
   */
  malwareOnWriteScanOptionAvailable: false,
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
