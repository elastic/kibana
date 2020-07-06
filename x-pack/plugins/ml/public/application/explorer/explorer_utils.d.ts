/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

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
) => string[];

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

export declare interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}

declare interface SwimlaneBounds {
  earliest: number;
  latest: number;
}

export declare const loadAnnotationsTableData: (
  selectedCells: AppStateSelectedCells | undefined,
  selectedJobs: ExplorerJob[],
  interval: number,
  bounds: TimeRangeBounds
) => Promise<any[]>;

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
  influencersFilterQuery: any
) => Promise<AnomaliesTableData>;

export declare const loadDataForCharts: (
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  influencers: any[],
  selectedCells: AppStateSelectedCells | undefined,
  influencersFilterQuery: any
) => Promise<any[] | undefined>;

export declare const loadFilteredTopInfluencers: (
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  records: any[],
  influencers: any[],
  noInfluencersConfigured: boolean,
  influencersFilterQuery: any
) => Promise<any[]>;

export declare const loadTopInfluencers: (
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

export declare const loadViewByTopFieldValuesForSelectedTime: (
  earliestMs: number,
  latestMs: number,
  selectedJobs: ExplorerJob[],
  viewBySwimlaneFieldName: string,
  swimlaneLimit: number,
  noInfluencersConfigured: boolean
) => Promise<any>;

export declare interface FilterData {
  influencersFilterQuery: any;
  filterActive: boolean;
  filteredFields: string[];
  queryString: string;
}

export declare interface AppStateSelectedCells {
  type: string;
  lanes: string[];
  times: number[];
  showTopFieldValues: boolean;
  viewByFieldName: string;
}
