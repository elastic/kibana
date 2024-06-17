/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defines a reference to a set of privileges of a specific feature.
 */
export interface FeatureKibanaPrivilegesReference {
  /**
   * The ID of the feature.
   */
  feature: string;
  /**
   * The set of IDs of feature or sub-feature privileges provided by the feature.
   */
  privileges: readonly string[];
}
