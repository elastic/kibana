/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeParams } from '../../../../alerting/common';
import { SerializedSearchSourceFields } from '../../../../../../src/plugins/data/common';

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export enum SearchType {
  esQuery = 'esQuery',
  searchSource = 'searchSource',
}

export interface CommonAlertParams<T extends SearchType> extends AlertTypeParams {
  size: number;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  searchType: T;
}

export type EsQueryAlertParams<T = SearchType> = T extends SearchType.esQuery
  ? CommonAlertParams<SearchType.esQuery> & OnlyEsQueryAlertParams
  : CommonAlertParams<SearchType.searchSource> & OnlySearchSourceAlertParams;

export interface OnlyEsQueryAlertParams {
  esQuery: string;
  index: string[];
  timeField: string;
}
export interface OnlySearchSourceAlertParams {
  searchConfiguration: SerializedSearchSourceFields;
}
