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

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export enum SearchType {
  esQuery = 'esQuery',
  searchSource = 'searchSource',
}

export interface CommonRuleParams extends RuleTypeParams {
  size: number;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  excludeHitsFromPreviousRun: boolean;
}

export interface EsQueryRuleMetaData {
  adHocDataViewList: DataView[];
  isManagementPage?: boolean;
}

export type EsQueryRuleParams<T = SearchType> = T extends SearchType.searchSource
  ? CommonRuleParams & OnlySearchSourceRuleParams
  : CommonRuleParams & OnlyEsQueryRuleParams;

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

export type DataViewOption = EuiComboBoxOptionOption<string>;
