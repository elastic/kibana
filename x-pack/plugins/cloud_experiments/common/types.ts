/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The contract of the setup lifecycle method.
 */
export interface CloudExperimentsPluginSetup extends CloudExperimentsPluginStart {
  /**
   * Identifies the user in the A/B testing service.
   * For now, we only rely on the user ID. In the future, we may request further details for more targeted experiments.
   * @param userId The unique identifier of the user in the experiment.
   * @param userMetadata Additional attributes to the user.
   */
  identifyUser: (
    userId: string,
    userMetadata?: Record<string, string | boolean | number | Array<string | boolean | number>>
  ) => void;
}

/**
 * The contract of the start lifecycle method
 */
export interface CloudExperimentsPluginStart {
  /**
   * Fetch the configuration assigned to variation `configKey`. If nothing is found, fallback to `defaultValue`.
   * @param configKey The name of the key to find the config variation.
   * @param defaultValue The fallback value in case no variation is found.
   */
  getVariation: <Data>(configKey: string, defaultValue: Data) => Promise<Data>;
  /**
   * Report metrics back to the A/B testing service to measure the conversion rate for each variation in the experiment.
   * @param metric {@link CloudExperimentsMetric}
   */
  reportMetric: <Data>(metric: CloudExperimentsMetric<Data>) => void;
}

/**
 * Definition of the metric to report back to the A/B testing service to measure the conversions.
 */
export interface CloudExperimentsMetric<Data> {
  /**
   * The name of the metric.
   */
  metricName: string;
  /**
   * Any optional data to enrich the context of the metric. Or if the conversion is based on a non-numeric value.
   */
  metricData?: Data;
  /**
   * The numeric value of the metric. Mostly used to track the conversion rates.
   */
  metricValue?: number;
}
