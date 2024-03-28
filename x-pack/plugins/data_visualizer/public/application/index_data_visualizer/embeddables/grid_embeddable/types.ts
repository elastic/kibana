/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { Query } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { SamplingOption } from '../../../../../common/types/field_stats';
import type { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import type { ESQLQuery } from '../../search_strategy/requests/esql_utils';

export interface DataVisualizerGridInput<T = Query> {
  dataView?: DataView;
  savedSearch?: SavedSearch | null;
  query?: T;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  allowEditDataView?: boolean;
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  samplingOption?: SamplingOption;
  /**
   * If esql:true, switch table to ES|QL mode
   */
  esql?: boolean;
  /**
   * If esql:true, the index pattern is used to validate time field
   */
  indexPattern?: string;
}

export type ESQLDataVisualizerGridEmbeddableInput = DataVisualizerGridInput<ESQLQuery>;

export type DataVisualizerGridEmbeddableInput = EmbeddableInput & DataVisualizerGridInput;
export type DataVisualizerGridEmbeddableOutput = EmbeddableOutput;

export type ESQLDefaultLimitSizeOption = '5000' | '10000' | '100000';

export interface ESQLDataVisualizerIndexBasedAppState extends DataVisualizerIndexBasedAppState {
  limitSize: ESQLDefaultLimitSizeOption;
}

export interface ESQLDataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<ESQLDataVisualizerIndexBasedAppState>;
}
