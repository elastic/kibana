/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { CustomThresholdExpressionMetric } from '../../../../../common/custom_threshold_rule/types';
import { MetricExpression } from '../../types';

export type CustomMetrics = MetricExpression['metrics'];

export interface AggregationTypes {
  [x: string]: AggregationType;
}

export interface NormalizedField {
  name: string;
  normalizedType: string;
  esTypes?: string[];
}

export type NormalizedFields = NormalizedField[];

export interface MetricRowBaseProps {
  name: string;
  onAdd: () => void;
  onDelete: (name: string) => void;
  disableDelete: boolean;
  disableAdd: boolean;
  onChange: (metric: CustomThresholdExpressionMetric) => void;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
}
