/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery, Filter } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { BehaviorSubject } from 'rxjs';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { DataVisualizerTableState } from '../../../../../common/types';
import type { SamplingOption } from '../../../../../common/types/field_stats';
import type { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';
import type { ESQLQuery } from '../../search_strategy/requests/esql_utils';

export interface FieldStatisticTableEmbeddableProps {
  /**
   * Data view is required for esql:false or non-ESQL mode
   */
  dataView?: DataView;
  /**
   * Kibana saved search object
   */
  savedSearch?: SavedSearch | null;
  /**
   * Kibana query
   */
  query?: Query | AggregateQuery;
  /**
   * List of fields to visibile show in the table
   * set shouldGetSubfields: true if table needs to show the sub multi-field like .keyword
   */
  visibleFieldNames?: string[];
  /**
   * List of filters
   */
  filters?: Filter[];
  /**
   * Whether to show the preview/mini distribution chart on the tables upon first table mounting
   */
  showPreviewByDefault?: boolean;
  /**
   * If true, will show a button action to edit the data view field in every row
   */
  allowEditDataView?: boolean;
  /**
   * Optional id to identify the embeddable
   */
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Optional search sessionId to save and restore long running search
   * If not provided, will generate its own sessionId
   */
  sessionId?: string;
  /**
   * Optional list of fields provided to table to fetch a subset of fields only
   * so it doesn't need to fetch all fields
   */
  fieldsToFetch?: string[];
  /**
   * Optional total documents count provided to help table have context of the fetch size
   * so it can reduce redundant API requests
   */
  totalDocuments?: number;
  /**
   * For non-ESQL mode, the sampling option is used to determine the sampling strategy
   */
  samplingOption?: SamplingOption;
  /**
   * If esql:true, switch table to ES|QL mode
   */
  esql?: boolean;
  /**
   * If esql:true, the index pattern is used to validate time field
   */
  indexPattern?: string;
  /**
   * If true, the table will try to retrieve subfield information as well based on visibleFields
   * For example: visibleFields: ['field1', 'field2'] => will show ['field1', 'field1.keyword', 'field2', 'field2.keyword']
   */
  shouldGetSubfields?: boolean;
  lastReloadRequestTime?: number;
  onTableUpdate?: (update: Partial<DataVisualizerTableState>) => void;
}

export type ESQLDataVisualizerGridEmbeddableState = Omit<
  FieldStatisticTableEmbeddableProps,
  'query'
> & { query?: ESQLQuery };

export type FieldStatisticsTableEmbeddableState = FieldStatisticTableEmbeddableProps &
  SerializedTitles;
interface FieldStatisticsTableEmbeddableComponentApi {
  showDistributions$?: BehaviorSubject<boolean>;
}

export type OnAddFilter = (field: DataViewField | string, value: string, type: '+' | '-') => void;
export interface FieldStatisticsTableEmbeddableParentApi {
  executionContext?: { value: string };
  embeddableState$: BehaviorSubject<FieldStatisticsTableEmbeddableState>;
  overrideServices?: Partial<DataVisualizerStartDependencies>;
  onAddFilter?: OnAddFilter;
}

export type FieldStatisticsTableEmbeddableApi =
  DefaultEmbeddableApi<FieldStatisticsTableEmbeddableState> &
    FieldStatisticsTableEmbeddableComponentApi;

export type DataVisualizerGridEmbeddableApi = Partial<FieldStatisticsTableEmbeddableState>;

export type ESQLDefaultLimitSizeOption = '5000' | '10000' | '100000';

export interface ESQLDataVisualizerIndexBasedAppState
  extends Omit<DataVisualizerIndexBasedAppState, 'query'> {
  limitSize: ESQLDefaultLimitSizeOption;
  query?: ESQLQuery;
}

export interface ESQLDataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<ESQLDataVisualizerIndexBasedAppState>;
}
