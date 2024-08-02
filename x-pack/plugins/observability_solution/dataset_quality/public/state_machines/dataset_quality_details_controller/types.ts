/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import { DegradedFieldSortField } from '../../hooks';
import {
  DataStreamDetails,
  DegradedField,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import { TableCriteria, TimeRangeConfig } from '../../../common/types';

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

export interface WithDefaultControllerState {
  dataStream: string;
  degradedFields: DegradedFieldsTableConfig;
  timeRange: TimeRangeConfig;
  isBreakdownFieldEcs?: boolean;
  breakdownField?: string;
}

export interface WithDataStreamDetails {
  dataStreamDetails: DataStreamDetails;
}

export interface WithBreakdownField {
  breakdownField: string | undefined;
}

export interface WithBreakdownInEcsCheck {
  isBreakdownFieldEcs: boolean;
}

export interface WithDegradedFieldsData {
  degradedFields: DegradedFieldsWithData;
}

export interface WithNonAggregatableDatasetStatus {
  isNonAggregatable: boolean;
}

export type DefaultDatasetQualityDetailsContext = Pick<
  WithDefaultControllerState,
  'degradedFields' | 'timeRange'
>;

export type DatasetQualityDetailsControllerTypeState =
  | {
      value:
        | 'initializing'
        | 'uninitialized'
        | 'initializing.nonAggregatableDataset.fetching'
        | 'initializing.dataStreamDetails.fetching';
      context: WithDefaultControllerState;
    }
  | {
      value: 'initializing.nonAggregatableDataset.done';
      context: WithDefaultControllerState & WithNonAggregatableDatasetStatus;
    }
  | {
      value: 'initializing.dataStreamDetails.done';
      context: WithDefaultControllerState & WithDataStreamDetails;
    }
  | {
      value: 'initializing.checkBreakdownFieldIsEcs.fetching';
      context: WithDefaultControllerState & WithBreakdownField;
    }
  | {
      value: 'initializing.checkBreakdownFieldIsEcs.done';
      context: WithDefaultControllerState & WithBreakdownInEcsCheck;
    };

export type DatasetQualityDetailsControllerContext =
  DatasetQualityDetailsControllerTypeState['context'];

export type DatasetQualityDetailsControllerEvent =
  | {
      type: 'UPDATE_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | {
      type: 'BREAKDOWN_FIELD_CHANGE';
      breakdownField: string | undefined;
    }
  | DoneInvokeEvent<NonAggregatableDatasets>
  | DoneInvokeEvent<DataStreamDetails>
  | DoneInvokeEvent<Error>
  | DoneInvokeEvent<boolean>;
