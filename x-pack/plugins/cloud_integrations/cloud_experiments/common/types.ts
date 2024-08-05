/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FEATURE_FLAG_NAMES, METRIC_NAMES } from './constants';

/**
 * The names of the feature flags declared in Kibana.
 * Valid keys are defined in {@link FEATURE_FLAG_NAMES}. When using a new feature flag, add the name to the list.
 *
 * @public
 */
export type CloudExperimentsFeatureFlagNames = keyof typeof FEATURE_FLAG_NAMES;

/**
 * The contract of the start lifecycle method
 *
 * @public
 * @deprecated in favor of the upcoming Core Feature Flags Service.
 */
export interface CloudExperimentsPluginStart {
  /**
   * Fetch the configuration assigned to variation `configKey`. If nothing is found, fallback to `defaultValue`.
   * @param featureFlagName The name of the key to find the config variation. {@link CloudExperimentsFeatureFlagNames}.
   * @param defaultValue The fallback value in case no variation is found.
   *
   * @public
   * @deprecated in favor of the upcoming Core Feature Flags Service.
   */
  getVariation: <Data>(
    featureFlagName: CloudExperimentsFeatureFlagNames,
    defaultValue: Data
  ) => Promise<Data>;
  /**
   * Report metrics back to the A/B testing service to measure the conversion rate for each variation in the experiment.
   * @param metric {@link CloudExperimentsMetric}
   *
   * @public
   * @deprecated in favor of the upcoming Core Feature Flags Service.
   */
  reportMetric: <Data>(metric: CloudExperimentsMetric<Data>) => void;
}

/**
 * The names of the metrics declared in Kibana.
 * Valid keys are defined in {@link METRIC_NAMES}. When reporting a new metric, add the name to the list.
 *
 * @public
 */
export type CloudExperimentsMetricNames = keyof typeof METRIC_NAMES;

/**
 * Definition of the metric to report back to the A/B testing service to measure the conversions.
 *
 * @public
 */
export interface CloudExperimentsMetric<Data> {
  /**
   * The name of the metric {@link CloudExperimentsMetricNames}
   */
  name: CloudExperimentsMetricNames;
  /**
   * Any optional data to enrich the context of the metric. Or if the conversion is based on a non-numeric value.
   */
  meta?: Data;
  /**
   * The numeric value of the metric. Bear in mind that they are averaged by the underlying solution.
   * Typical values to report here are time-to-action, number of panels in a loaded dashboard, and page load time.
   */
  value?: number;
}
