/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import {
  DataStreamDocsStat,
  DatasetUserPrivileges,
  NonAggregatableDatasets,
} from '../../../../common/api_types';
import {
  DataStreamDetails,
  DataStreamStat,
  DataStreamStatServiceResponse,
  DataStreamStatType,
} from '../../../../common/data_streams_stats';
import { Integration } from '../../../../common/data_streams_stats/integration';
import {
  DataStreamType,
  QualityIndicators,
  TableCriteria,
  TimeRangeConfig,
} from '../../../../common/types';
import { DatasetTableSortField } from '../../../hooks';

interface FiltersCriteria {
  inactive: boolean;
  fullNames: boolean;
  timeRange: TimeRangeConfig;
  integrations: string[];
  namespaces: string[];
  qualities: QualityIndicators[];
  types: string[];
  query?: string;
}

export interface WithTableOptions {
  table: TableCriteria<DatasetTableSortField>;
}

export interface WithFilters {
  filters: FiltersCriteria;
}

export type DictionaryType<T> = Record<DataStreamType, T[]>;

export interface WithDataStreamStats {
  datasetUserPrivileges: DatasetUserPrivileges;
  dataStreamStats: DataStreamStatType[];
}

export interface WithTotalDocs {
  totalDocsStats: DictionaryType<DataStreamDocsStat>;
}

export interface WithDegradedDocs {
  degradedDocStats: DataStreamDocsStat[];
}

export interface WithNonAggregatableDatasets {
  nonAggregatableDatasets: string[];
}

export interface WithDatasets {
  datasets: DataStreamStat[];
}

export interface WithIntegrations {
  integrations: Integration[];
}

export type DefaultDatasetQualityControllerState = WithTableOptions &
  WithDataStreamStats &
  WithTotalDocs &
  WithDegradedDocs &
  WithDatasets &
  WithFilters &
  WithNonAggregatableDatasets &
  Partial<WithIntegrations>;

type DefaultDatasetQualityStateContext = DefaultDatasetQualityControllerState;

export type DatasetQualityControllerTypeState =
  | {
      value: 'stats.datasets.fetching';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'stats.datasets.loaded';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'stats.degradedDocs.fetching';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'stats.nonAggregatableDatasets.fetching';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'integrations.fetching';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'nonAggregatableDatasets.fetching';
      context: DefaultDatasetQualityStateContext;
    };

export type DatasetQualityControllerContext = DatasetQualityControllerTypeState['context'];

export type DatasetQualityControllerEvent =
  | {
      type: 'UPDATE_TABLE_CRITERIA';
      dataset_criteria: TableCriteria<DatasetTableSortField>;
    }
  | {
      type: 'UPDATE_INSIGHTS_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | {
      type: 'TOGGLE_INACTIVE_DATASETS';
    }
  | {
      type: 'TOGGLE_FULL_DATASET_NAMES';
    }
  | {
      type: 'UPDATE_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | {
      type: 'REFRESH_DATA';
    }
  | {
      type: 'UPDATE_INTEGRATIONS';
      integrations: string[];
    }
  | {
      type: 'UPDATE_NAMESPACES';
      namespaces: string[];
    }
  | {
      type: 'UPDATE_QUALITIES';
      qualities: QualityIndicators[];
    }
  | {
      type: 'UPDATE_QUERY';
      query: string;
    }
  | {
      type: 'UPDATE_TYPES';
      types: DataStreamType[];
    }
  | DoneInvokeEvent<DataStreamDocsStat[]>
  | DoneInvokeEvent<NonAggregatableDatasets>
  | DoneInvokeEvent<DataStreamDetails>
  | DoneInvokeEvent<DataStreamStatServiceResponse>
  | DoneInvokeEvent<Integration>
  | DoneInvokeEvent<boolean | null>
  | DoneInvokeEvent<Error>;
