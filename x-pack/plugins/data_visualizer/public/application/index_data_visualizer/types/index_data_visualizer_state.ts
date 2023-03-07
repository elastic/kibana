/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { Query } from '@kbn/data-plugin/common/query';
import type { RandomSamplerOption } from '../constants/random_sampler';
import type { SearchQueryLanguage } from './combined_query';

import type { DATA_VISUALIZER_INDEX_VIEWER } from '../constants/index_data_visualizer_viewer';

export interface DataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<DataVisualizerIndexBasedAppState>;
}

export interface ListingPageUrlState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  queryText?: string;
}

export interface DataVisualizerIndexBasedAppState extends Omit<ListingPageUrlState, 'queryText'> {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage?: SearchQueryLanguage;
  visibleFieldTypes?: string[];
  visibleFieldNames?: string[];
  samplerShardSize?: number;
  showDistributions?: boolean;
  showAllFields?: boolean;
  showEmptyFields?: boolean;
  filters?: Filter[];
  probability?: number | null;
  rndSamplerPref?: RandomSamplerOption;
}
