/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ClassFeatureImportance {
  class_name: string | boolean;
  importance: number;
}
export interface FeatureImportance {
  feature_name: string;
  importance?: number;
  classes?: ClassFeatureImportance[];
}

export interface TopClass {
  class_name: string;
  class_probability: number;
  class_score: number;
}

export type TopClasses = TopClass[];
