/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
import { DoneInvokeEvent } from 'xstate';
import { DegradedFieldSortField } from '../../hooks';
import { DegradedField, NonAggregatableDatasets } from '../../../common/api_types';
import { TableCriteria } from '../../../common/types';

export interface DataStream {
  name: string;
  type: string;
  namespace: string;
  rawName: string;
}

export interface DegradedFieldsTableConfig {
  table: TableCriteria<DegradedFieldSortField>;
}

export interface DegradedFieldsWithData {
  table: TableCriteria<DegradedFieldSortField>;
  data: DegradedField[];
}

export type TimeRangeConfig = Pick<TimeRange, 'from' | 'to'> & {
  refresh: RefreshInterval;
};

export interface WithDefaultControllerState {
  datastream: string;
  degradedFields: DegradedFieldsTableConfig;
  isBreakdownFieldEcs: boolean | null;
  timeRange: TimeRangeConfig;
}

export interface WithDegradedFieldsData {
  degradedFields: DegradedFieldsWithData;
}

export interface WithNonAggregatableDatasetStatus {
  isNonAggregatable: boolean;
}

export type DefaultDatasetQualityDetailsContext = Pick<
  WithDefaultControllerState,
  'degradedFields' | 'isBreakdownFieldEcs' | 'timeRange'
>;

export type DatasetQualityDetailsControllerTypeState =
  | {
      value: 'initializing' | 'uninitialized';
      context: WithDefaultControllerState;
    }
  | {
      value: 'initializing.nonAggregatableDataset.done';
      context: WithDefaultControllerState & WithNonAggregatableDatasetStatus;
    };

export type DatasetQualityDetailsControllerContext =
  DatasetQualityDetailsControllerTypeState['context'];

export type DatasetQualityDetailsControllerEvent =
  | {
      type: 'UPDATE_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | DoneInvokeEvent<NonAggregatableDatasets>
  | DoneInvokeEvent<Error>;
