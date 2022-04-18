/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { EXPRESSION_ERRORS } from './constants';

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export enum SearchType {
  esQuery = 'esQuery',
  searchSource = 'searchSource',
}

export interface CommonAlertParams extends RuleTypeParams {
  size: number;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
}

export type EsQueryAlertParams<T = SearchType> = T extends SearchType.searchSource
  ? CommonAlertParams & OnlySearchSourceAlertParams
  : CommonAlertParams & OnlyEsQueryAlertParams;

export interface OnlyEsQueryAlertParams {
  esQuery: string;
  index: string[];
  timeField: string;
}
export interface OnlySearchSourceAlertParams {
  searchType: 'searchSource';
  searchConfiguration: SerializedSearchSourceFields;
}

export type DataViewOption = EuiComboBoxOptionOption<string>;

export type ExpressionErrors = typeof EXPRESSION_ERRORS;

export type ErrorKey = keyof ExpressionErrors & unknown;
