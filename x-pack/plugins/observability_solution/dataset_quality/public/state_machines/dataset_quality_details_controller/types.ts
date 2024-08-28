/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DoneInvokeEvent } from 'xstate';
import type { DegradedFieldSortField } from '../../hooks';
import {
  Dashboard,
  DataStreamDetails,
  DataStreamSettings,
  DegradedField,
  DegradedFieldResponse,
  DegradedFieldValues,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import { TableCriteria, TimeRangeConfig } from '../../../common/types';
import { Integration } from '../../../common/data_streams_stats/integration';

export interface DataStream {
  name: string;
  type: string;
  namespace: string;
  rawName: string;
}

export interface DegradedFieldsTableConfig {
  table: TableCriteria<DegradedFieldSortField>;
  data?: DegradedField[];
}

export interface DegradedFieldsWithData {
  table: TableCriteria<DegradedFieldSortField>;
  data: DegradedField[];
}

export interface WithDefaultControllerState {
  dataStream: string;
  degradedFields: DegradedFieldsTableConfig;
  timeRange: TimeRangeConfig;
  breakdownField?: string;
  isBreakdownFieldEcs?: boolean;
  isIndexNotFoundError?: boolean;
  integration?: Integration;
  expandedDegradedField?: string;
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

export interface WithDataStreamSettings {
  dataStreamSettings: DataStreamSettings;
}

export interface WithIntegration {
  integration: Integration;
  integrationDashboards?: Dashboard[];
}

export interface WithDegradedFieldValues {
  degradedFieldValues: DegradedFieldValues;
}

export type DefaultDatasetQualityDetailsContext = Pick<
  WithDefaultControllerState,
  'degradedFields' | 'timeRange' | 'isIndexNotFoundError'
>;

export type DatasetQualityDetailsControllerTypeState =
  | {
      value:
        | 'initializing'
        | 'uninitialized'
        | 'initializing.nonAggregatableDataset.fetching'
        | 'initializing.dataStreamDegradedFields.fetching'
        | 'initializing.dataStreamSettings.fetching'
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
    }
  | {
      value: 'initializing.dataStreamDegradedFields.done';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value: 'initializing.initializeFixItFlow.ignoredValues.fetching';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value: 'initializing.initializeFixItFlow.ignoredValues.done';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradedFieldValues;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.initializeIntegrations'
        | 'initializing.dataStreamSettings.initializeIntegrations.integrationDetails.fetching'
        | 'initializing.dataStreamSettings.initializeIntegrations.integrationDashboards.fetching'
        | 'initializing.dataStreamSettings.initializeIntegrations.integrationDashboards.unauthorized';
      context: WithDefaultControllerState & WithDataStreamSettings;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.initializeIntegrations.integrationDetails.done'
        | 'initializing.dataStreamSettings.initializeIntegrations.integrationDashboards.done';
      context: WithDefaultControllerState & WithDataStreamSettings & WithIntegration;
    };

export type DatasetQualityDetailsControllerContext =
  DatasetQualityDetailsControllerTypeState['context'];

export type DatasetQualityDetailsControllerEvent =
  | {
      type: 'UPDATE_TIME_RANGE';
      timeRange: TimeRangeConfig;
    }
  | {
      type: 'OPEN_DEGRADED_FIELD_FLYOUT';
      fieldName: string | undefined;
    }
  | {
      type: 'CLOSE_DEGRADED_FIELD_FLYOUT';
    }
  | {
      type: 'BREAKDOWN_FIELD_CHANGE';
      breakdownField: string | undefined;
    }
  | {
      type: 'UPDATE_DEGRADED_FIELDS_TABLE_CRITERIA';
      degraded_field_criteria: TableCriteria<DegradedFieldSortField>;
    }
  | DoneInvokeEvent<NonAggregatableDatasets>
  | DoneInvokeEvent<DataStreamDetails>
  | DoneInvokeEvent<Error>
  | DoneInvokeEvent<boolean>
  | DoneInvokeEvent<DegradedFieldResponse>
  | DoneInvokeEvent<DegradedFieldValues>
  | DoneInvokeEvent<DataStreamSettings>
  | DoneInvokeEvent<Integration>
  | DoneInvokeEvent<Dashboard[]>;
