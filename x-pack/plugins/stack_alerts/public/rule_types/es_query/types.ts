/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { EXPRESSION_ERRORS } from './constants';

export enum SearchType {
  esQuery = 'esQuery',
  searchSource = 'searchSource',
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
  termField?: string;
  excludeHitsFromPreviousRun: boolean;
}

export interface CommonEsQueryRuleParams extends RuleTypeParams, CommonRuleParams {}

export interface EsQueryRuleMetaData {
  adHocDataViewList: DataView[];
  isManagementPage?: boolean;
}

export type EsQueryRuleParams<T = SearchType> = T extends SearchType.searchSource
  ? CommonEsQueryRuleParams & OnlySearchSourceRuleParams
  : CommonEsQueryRuleParams & OnlyEsQueryRuleParams;

export interface OnlyEsQueryRuleParams {
  esQuery: string;
  index: string[];
  timeField: string;
}

export interface OnlySearchSourceRuleParams {
  searchType?: 'searchSource';
  searchConfiguration?: SerializedSearchSourceFields;
  savedQueryId?: string;
}

export type DataViewOption = EuiComboBoxOptionOption<string>;

export type ExpressionErrors = typeof EXPRESSION_ERRORS;

export type ErrorKey = keyof ExpressionErrors & unknown;

export interface TriggersAndActionsUiDeps {
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
}
