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

export interface ClassFeatureImportanceSummary {
  class_name: string;
  importance: {
    max: number;
    min: number;
    mean_magnitude: number;
  };
}
export interface ClassificationTotalFeatureImportance {
  feature_name: string;
  classes: ClassFeatureImportanceSummary[];
}

export interface RegressionFeatureImportanceSummary {
  max: number;
  min: number;
  mean_magnitude: number;
}

export interface RegressionTotalFeatureImportance {
  feature_name: string;
  importance: RegressionFeatureImportanceSummary;
}
export type TotalFeatureImportance =
  | ClassificationTotalFeatureImportance
  | RegressionTotalFeatureImportance;

export interface FeatureImportanceClassBaseline {
  class_name: string;
  baseline: number;
}
export interface ClassificationFeatureImportanceBaseline {
  classes: FeatureImportanceClassBaseline[];
}

export interface RegressionFeatureImportanceBaseline {
  baseline: number;
}

export type FeatureImportanceBaseline =
  | ClassificationFeatureImportanceBaseline
  | RegressionFeatureImportanceBaseline;

export function isClassificationTotalFeatureImportance(
  summary: ClassificationTotalFeatureImportance | RegressionTotalFeatureImportance
): summary is ClassificationTotalFeatureImportance {
  return (summary as ClassificationTotalFeatureImportance).classes !== undefined;
}

export function isRegressionTotalFeatureImportance(
  summary: ClassificationTotalFeatureImportance | RegressionTotalFeatureImportance
): summary is RegressionTotalFeatureImportance {
  return (summary as RegressionTotalFeatureImportance).importance !== undefined;
}

export function isClassificationFeatureImportanceBaseline(
  baselineData: ClassificationFeatureImportanceBaseline | RegressionFeatureImportanceBaseline
): baselineData is ClassificationFeatureImportanceBaseline {
  return (baselineData as ClassificationFeatureImportanceBaseline).classes !== undefined;
}

export function isRegressionFeatureImportanceBaseline(
  baselineData: ClassificationFeatureImportanceBaseline | RegressionFeatureImportanceBaseline
): baselineData is RegressionFeatureImportanceBaseline {
  return (baselineData as RegressionFeatureImportanceBaseline).baseline !== undefined;
}
