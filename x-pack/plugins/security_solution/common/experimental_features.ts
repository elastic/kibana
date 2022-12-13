/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = typeof allowedExperimentalValues;

/**
 * A list of allowed values that can be used in `xpack.securitySolution.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  tGridEnabled: true,
  tGridEventRenderedViewEnabled: true,
  excludePoliciesInFilterEnabled: false,
  kubernetesEnabled: true,
  disableIsolationUIPendingStatuses: false,
  pendingActionResponsesWithAck: true,
  policyListEnabled: true,
  policyResponseInFleetEnabled: true,
  chartEmbeddablesEnabled: false,

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
   * Enables the Endpoint response actions console in various areas of the app
   */
  responseActionsConsoleEnabled: true,

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
   * Enables the detection response actions in rule + alerts
   */
  responseActionsEnabled: true,

  /**
   * Enables endpoint package level rbac
   */
  endpointRbacEnabled: false,

  /**
   * Enables endpoint package level rbac for response actions only.
   * if endpointRbacEnabled is enabled, it will take precedence.
   */
  endpointRbacV1Enabled: true,
  /**
   * Enables the alert details page currently only accessible via the alert details flyout and alert table context menu
   */
  alertDetailsPageEnabled: false,

  /**
   * Enables the `get-file` endpoint response action
   */
  responseActionGetFileEnabled: false,

  /**
   * Enables top charts on Alerts Page
   */
  alertsPageChartsEnabled: false,

  /**
   * Keep DEPRECATED experimental flags that are documented to prevent failed upgrades.
   * https://www.elastic.co/guide/en/security/current/user-risk-score.html
   * https://www.elastic.co/guide/en/security/current/host-risk-score.html
   *
   * Issue: https://github.com/elastic/kibana/issues/146777
   */
  riskyHostsEnabled: false, // DEPRECATED
  riskyUsersEnabled: false, // DEPRECATED
});

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const SecuritySolutionInvalidExperimentalValue = class extends Error {};
const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.securitySolution.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 * @throws SecuritySolutionInvalidExperimentalValue
 */
export const parseExperimentalConfigValue = (configValue: string[]): ExperimentalFeatures => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};

  for (const value of configValue) {
    if (!isValidExperimentalValue(value)) {
      throw new SecuritySolutionInvalidExperimentalValue(`[${value}] is not valid.`);
    }

    enabledFeatures[value as keyof ExperimentalFeatures] = true;
  }

  return {
    ...allowedExperimentalValues,
    ...enabledFeatures,
  };
};

export const isValidExperimentalValue = (value: string): boolean => {
  return allowedKeys.includes(value as keyof ExperimentalFeatures);
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
