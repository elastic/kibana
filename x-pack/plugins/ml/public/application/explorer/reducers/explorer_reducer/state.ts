/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import type { AnnotationsTable } from '../../../../../common/types/annotations';
import type { Dictionary } from '../../../../../common/types/common';
import type { InfluencersFilterQuery } from '../../../../../common/types/es_client';
import type { TimeBucketsInterval } from '../../../util/time_buckets';
import type { ExplorerChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { getDefaultChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../explorer_constants';
import type {
  AnomaliesTableData,
  AppStateSelectedCells,
  ExplorerJob,
  OverallSwimlaneData,
  SwimlaneData,
  ViewBySwimLaneData,
} from '../../explorer_utils';
import { getDefaultSwimlaneData } from '../../explorer_utils';

export interface ExplorerState {
  overallAnnotations: AnnotationsTable;
  annotations: AnnotationsTable;
  anomalyChartsDataLoading: boolean;
  chartsData: ExplorerChartsData;
  fieldFormatsLoading: boolean;
  filterActive: boolean;
  filteredFields: any[];
  filterPlaceHolder: any;
  indexPattern: { title: string; fields: any[] };
  influencersFilterQuery?: InfluencersFilterQuery;
  influencers: Dictionary<any>;
  isAndOperator: boolean;
  loading: boolean;
  maskAll: boolean;
  noInfluencersConfigured: boolean;
  overallSwimlaneData: SwimlaneData | OverallSwimlaneData;
  queryString: string;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[] | null;
  swimlaneBucketInterval: TimeBucketsInterval | undefined;
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
  swimLaneSeverity?: number;
}

function getDefaultIndexPattern() {
  return { title: ML_RESULTS_INDEX_PATTERN, fields: [] };
}

export function getExplorerDefaultState(): ExplorerState {
  return {
    overallAnnotations: {
      error: undefined,
      annotationsData: [],
      aggregations: {},
    },
    annotations: {
      error: undefined,
      annotationsData: [],
      aggregations: {},
    },
    anomalyChartsDataLoading: true,
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
