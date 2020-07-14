/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import { Dictionary } from '../../../../../common/types/common';

import {
  getDefaultChartsData,
  ExplorerChartsData,
} from '../../explorer_charts/explorer_charts_container_service';
import {
  getDefaultSwimlaneData,
  AnomaliesTableData,
  ExplorerJob,
  AppStateSelectedCells,
  TimeRangeBounds,
  OverallSwimlaneData,
  SwimlaneData,
  ViewBySwimLaneData,
} from '../../explorer_utils';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../explorer_constants';

export interface ExplorerState {
  annotationsData: any[];
  bounds: TimeRangeBounds | undefined;
  chartsData: ExplorerChartsData;
  fieldFormatsLoading: boolean;
  filterActive: boolean;
  filteredFields: any[];
  filterPlaceHolder: any;
  indexPattern: { title: string; fields: any[] };
  influencersFilterQuery: any;
  influencers: Dictionary<any>;
  isAndOperator: boolean;
  loading: boolean;
  maskAll: boolean;
  noInfluencersConfigured: boolean;
  overallSwimlaneData: SwimlaneData | OverallSwimlaneData;
  queryString: string;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[] | null;
  swimlaneBucketInterval: any;
  swimlaneContainerWidth: number;
  tableData: AnomaliesTableData;
  tableQueryString: string;
  viewByLoadedForTimeFormatted: string | null;
  viewBySwimlaneData: SwimlaneData | ViewBySwimLaneData;
  viewBySwimlaneDataLoading: boolean;
  viewBySwimlaneFieldName?: string;
  viewByPerPage: number;
  viewByFromPage: number;
  viewBySwimlaneOptions: string[];
  swimlaneLimit?: number;
}

function getDefaultIndexPattern() {
  return { title: ML_RESULTS_INDEX_PATTERN, fields: [] };
}

export function getExplorerDefaultState(): ExplorerState {
  return {
    annotationsData: [],
    bounds: undefined,
    chartsData: getDefaultChartsData(),
    fieldFormatsLoading: false,
    filterActive: false,
    filteredFields: [],
    filterPlaceHolder: undefined,
    indexPattern: getDefaultIndexPattern(),
    influencersFilterQuery: undefined,
    influencers: {},
    isAndOperator: false,
    loading: true,
    maskAll: false,
    noInfluencersConfigured: true,
    overallSwimlaneData: getDefaultSwimlaneData(),
    queryString: '',
    selectedCells: undefined,
    selectedJobs: null,
    swimlaneBucketInterval: undefined,
    swimlaneContainerWidth: 0,
    tableData: {
      anomalies: [],
      examplesByJobId: [''],
      interval: 0,
      jobIds: [],
      showViewSeriesLink: false,
    },
    tableQueryString: '',
    viewByLoadedForTimeFormatted: null,
    viewBySwimlaneData: getDefaultSwimlaneData(),
    viewBySwimlaneDataLoading: false,
    viewBySwimlaneFieldName: undefined,
    viewBySwimlaneOptions: [],
    viewByPerPage: SWIM_LANE_DEFAULT_PAGE_SIZE,
    viewByFromPage: 1,
    swimlaneLimit: undefined,
  };
}
