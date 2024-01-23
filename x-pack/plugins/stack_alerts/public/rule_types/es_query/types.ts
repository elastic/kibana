/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery } from '@kbn/es-query';

export enum SearchType {
  esQuery = 'esQuery',
  searchSource = 'searchSource',
  esqlQuery = 'esqlQuery',
}

export interface SourceField {
  label: string;
  searchPath: string;
}

export interface CommonRuleParams {
  size: number;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  aggType: string;
  aggField?: string;
  groupBy?: string;
  termSize?: number;
  termField?: string | string[];
  excludeHitsFromPreviousRun: boolean;
  sourceFields?: SourceField[];
}

export interface CommonEsQueryRuleParams extends RuleTypeParams, CommonRuleParams {}

export interface EsQueryRuleMetaData {
  adHocDataViewList: DataView[];
  isManagementPage?: boolean;
}

export type EsQueryRuleParams<T = SearchType> = T extends SearchType.searchSource
  ? CommonEsQueryRuleParams & OnlySearchSourceRuleParams
  : T extends SearchType.esqlQuery
  ? CommonEsQueryRuleParams & OnlyEsqlQueryRuleParams
  : CommonEsQueryRuleParams & OnlyEsQueryRuleParams;

export interface OnlyEsQueryRuleParams {
  esQuery: string;
  index: string[];
  timeField: string;
}

export interface OnlySearchSourceRuleParams {
  timeField?: string;
  searchType?: 'searchSource';
  searchConfiguration?: SerializedSearchSourceFields;
  savedQueryId?: string;
}

export interface OnlyEsqlQueryRuleParams {
  searchType?: 'esqlQuery';
  esqlQuery: AggregateQuery;
  timeField: string;
}

export type DataViewOption = EuiComboBoxOptionOption<string>;
