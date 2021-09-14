/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '../util/object_utils';

export type FeatureImportanceClassName = string | number | boolean;

export interface ClassFeatureImportance {
  class_name: FeatureImportanceClassName;
  importance: number;
}

// TODO We should separate the interface because classes/importance
// isn't both optional but either/or.
export interface FeatureImportance {
  feature_name: string;
  classes?: ClassFeatureImportance[];
  importance?: number;
}

export interface TopClass {
  class_name: FeatureImportanceClassName;
  class_probability: number;
  class_score: number;
}

export type TopClasses = TopClass[];

export interface ClassFeatureImportanceSummary {
  class_name: FeatureImportanceClassName;
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
  class_name: FeatureImportanceClassName;
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
  baselineData: any
): baselineData is ClassificationFeatureImportanceBaseline {
  return isPopulatedObject(baselineData, ['classes']) && Array.isArray(baselineData.classes);
}

export function isRegressionFeatureImportanceBaseline(
  baselineData: any
): baselineData is RegressionFeatureImportanceBaseline {
  return isPopulatedObject(baselineData, ['baseline']);
}
