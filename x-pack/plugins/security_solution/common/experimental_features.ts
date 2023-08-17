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
  alertsPreviewChartEmbeddablesEnabled: false, // Depends on https://github.com/elastic/kibana/issues/136409 item 9
  /**
   * This is used for enabling the end-to-end tests for the security_solution telemetry.
   * We disable the telemetry since we don't have specific roles or permissions around it and
   * we don't want people to be able to violate security by getting access to whole documents
   * around telemetry they should not.
   * @see telemetry_detection_rules_preview_route.ts
   * @see test/detection_engine_api_integration/security_and_spaces/tests/telemetry/README.md
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
   * Enables the alert details page currently only accessible via the alert details flyout and alert table context menu
   */
  alertDetailsPageEnabled: false,

  /**
   * Enables the `upload` endpoint response action (v8.9)
   */
  responseActionUploadEnabled: true,

  /**
   * Enables top charts on Alerts Page
   */
  alertsPageChartsEnabled: true,
  alertTypeEnabled: false,

  /*
   * Enables new Set of filters on the Alerts page.
   *
   **/
  alertsPageFiltersEnabled: true,

  /*
   * Enables the new user details flyout displayed on the Alerts page and timeline.
   *
   **/
  newUserDetailsFlyout: false,

  /**
   * Enables Protections/Detections Coverage Overview page (Epic link https://github.com/elastic/security-team/issues/2905)
   *
   * This flag aims to facilitate the development process as the feature may not make it to 8.9 release.
   *
   * The flag doesn't have to be documented and has to be removed after the feature is ready to release.
   */
  detectionsCoverageOverview: false,

  /**
   * Enable risk engine client and initialisation of datastream, component templates and mappings
   */
  riskScoringPersistence: false,

  /**
   * Enables experimental Entity Analytics HTTP endpoints
   */
  riskScoringRoutesEnabled: false,
  /*
   *
   * Enables Discover embedded within timeline
   *
   * */
  discoverInTimeline: false,
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
