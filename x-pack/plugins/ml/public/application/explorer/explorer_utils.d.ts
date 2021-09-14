/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationsTable } from '../../../common/types/annotations';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { SwimlaneType } from './explorer_constants';
import { TimeRangeBounds } from '../util/time_buckets';
import { RecordForInfluencer } from '../services/results_service/results_service';
import { InfluencersFilterQuery } from '../../../common/types/es_client';
import { MlResultsService } from '../services/results_service';
import { EntityField } from '../../../common/util/anomaly_utils';

interface ClearedSelectedAnomaliesState {
  selectedCells: undefined;
  viewByLoadedForTimeFormatted: null;
}

export declare const getClearedSelectedAnomaliesState: () => ClearedSelectedAnomaliesState;

export interface SwimlanePoint {
  laneLabel: string;
  time: number;
  value: number;
}

export declare interface SwimlaneData {
  fieldName?: string;
  laneLabels: string[];
  points: SwimlanePoint[];
  interval: number;
}
interface ChartRecord extends RecordForInfluencer {
  function: string;
}

export declare interface OverallSwimlaneData extends SwimlaneData {
  earliest: number;
  latest: number;
}

export interface ViewBySwimLaneData extends OverallSwimlaneData {
  cardinality: number;
}

export declare const getDateFormatTz: () => any;

export declare const getDefaultSwimlaneData: () => SwimlaneData;

export declare const getInfluencers: (selectedJobs: any[]) => string[];

export declare const getSelectionJobIds: (
  selectedCells: AppStateSelectedCells | undefined,
  selectedJobs: ExplorerJob[]
) => string[];

export declare const getSelectionInfluencers: (
  selectedCells: AppStateSelectedCells | undefined,
  fieldName: string
) => EntityField[];

interface SelectionTimeRange {
  earliestMs: number;
  latestMs: number;
}

export declare const getSelectionTimeRange: (
  selectedCells: AppStateSelectedCells | undefined,
  interval: number,
  bounds: TimeRangeBounds
) => SelectionTimeRange;

export declare const getSwimlaneBucketInterval: (
  selectedJobs: ExplorerJob[],
  swimlaneContainerWidth: number
) => any;

interface ViewBySwimlaneOptionsArgs {
  currentViewBySwimlaneFieldName: string | undefined;
  filterActive: boolean;
  filteredFields: any[];
  isAndOperator: boolean;
  selectedCells: AppStateSelectedCells;
  selectedJobs: ExplorerJob[];
}

interface ViewBySwimlaneOptions {
  viewBySwimlaneFieldName: string;
  viewBySwimlaneOptions: string[];
}

export declare const getViewBySwimlaneOptions: (
  arg: ViewBySwimlaneOptionsArgs
) => ViewBySwimlaneOptions;

export declare interface ExplorerJob {
  id: string;
  selected: boolean;
  bucketSpanSeconds: number;
}

export declare const createJobs: (jobs: CombinedJob[]) => ExplorerJob[];

declare interface SwimlaneBounds {
  earliest: number;
  latest: number;
}

export declare const loadOverallAnnotations: (
  selectedJobs: ExplorerJob[],
  interval: number,
  bounds: TimeRangeBounds
) => Promise<AnnotationsTable>;

export declare const loadAnnotationsTableData: (
  selectedCells: AppStateSelectedCells | undefined,
  selectedJobs: ExplorerJob[],
  interval: number,
  bounds: TimeRangeBounds
) => Promise<AnnotationsTable>;

export declare interface AnomaliesTableData {
  anomalies: any[];
  interval: number;
  examplesByJobId: string[];
  showViewSeriesLink: boolean;
  jobIds: string[];
}

export declare const loadAnomaliesTableData: (
  selectedCells: AppStateSelectedCells | undefined,
  selectedJobs: ExplorerJob[],
  dateFormatTz: any,
  interval: number,
  bounds: TimeRangeBounds,
  fieldName: string,
  tableInterval: string,
  tableSeverity: number,
  influencersFilterQuery: InfluencersFilterQuery
) => Promise<AnomaliesTableData>;

export declare const loadDataForCharts: (
  mlResultsService: MlResultsService,
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  influencers: any[],
  selectedCells: AppStateSelectedCells | undefined,
  influencersFilterQuery: InfluencersFilterQuery,
  // choose whether or not to keep track of the request that could be out of date
  takeLatestOnly: boolean
) => Promise<ChartRecord[] | undefined>;

export declare const loadFilteredTopInfluencers: (
  mlResultsService: MlResultsService,
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  records: any[],
  influencers: any[],
  noInfluencersConfigured: boolean,
  influencersFilterQuery: InfluencersFilterQuery
) => Promise<any[]>;

export declare const loadTopInfluencers: (
  mlResultsService: MlResultsService,
  selectedJobIds: string[],
  earliestMs: number,
  latestMs: number,
  influencers: any[],
  noInfluencersConfigured?: boolean,
  influencersFilterQuery?: any
) => Promise<any[]>;

declare interface LoadOverallDataResponse {
  loading: boolean;
  overallSwimlaneData: OverallSwimlaneData;
}

export declare interface FilterData {
  influencersFilterQuery: InfluencersFilterQuery;
  filterActive: boolean;
  filteredFields: string[];
  queryString: string;
}

export declare interface AppStateSelectedCells {
  type: SwimlaneType;
  lanes: string[];
  times: [number, number];
  showTopFieldValues?: boolean;
  viewByFieldName?: string;
}

export declare const removeFilterFromQueryString: (
  currentQueryString: string,
  fieldName: string,
  fieldValue: string
) => string;
