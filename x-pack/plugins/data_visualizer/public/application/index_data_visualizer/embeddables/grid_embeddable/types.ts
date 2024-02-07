/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import type { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { Query } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { SamplingOption } from '../../../../../common/types/field_stats';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';

export interface DataVisualizerGridInput {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: Query;
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
}

export type ESQLDataVisualizerGridEmbeddableInput = DataVisualizerGridInput;

export type DataVisualizerGridEmbeddableInput = EmbeddableInput & DataVisualizerGridInput;
export type DataVisualizerGridEmbeddableOutput = EmbeddableOutput;

export type ESQLDefaultLimitSizeOption = '5000' | '10000' | '100000' | '1000000' | 'none';

export interface ESQLDataVisualizerIndexBasedAppState extends DataVisualizerIndexBasedAppState {
  limitSize: ESQLDefaultLimitSizeOption;
}

export interface ESQLDataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<ESQLDataVisualizerIndexBasedAppState>;
}
