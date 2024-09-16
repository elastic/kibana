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
  DegradedFieldAnalysis,
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
  showCurrentQualityIssues: boolean;
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

export interface WithDegradeFieldAnalysis {
  degradedFieldAnalysis: DegradedFieldAnalysis;
}

export type DefaultDatasetQualityDetailsContext = Pick<
  WithDefaultControllerState,
  'degradedFields' | 'timeRange' | 'isIndexNotFoundError' | 'showCurrentQualityIssues'
>;

export type DatasetQualityDetailsControllerTypeState =
  | {
      value:
        | 'initializing'
        | 'initializing.nonAggregatableDataset.fetching'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.dataStreamDegradedFields.fetching'
        | 'initializing.dataStreamSettings.fetchingDataStreamSettings'
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
      value: 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.dataStreamDegradedFields.done';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value:
        | 'initializing.degradedFieldFlyout.open.ignoredValues.fetching'
        | 'initializing.degradedFieldFlyout.open.analyze.fetching';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.ignoredValues.done';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradedFieldValues;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.analyze.done';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradeFieldAnalysis;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open';
      context: WithDefaultControllerState &
        WithDegradedFieldsData &
        WithDegradedFieldValues &
        WithDegradeFieldAnalysis;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.integrationDetails.fetching'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.integrationDashboards.fetching'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.integrationDashboards.unauthorized';
      context: WithDefaultControllerState & WithDataStreamSettings;
    }
  | {
      value:
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.integrationDetails.done'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.integrationDashboards.done';
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
      type: 'DEGRADED_FIELDS_LOADED';
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
  | DoneInvokeEvent<Dashboard[]>
  | DoneInvokeEvent<DegradedFieldAnalysis>;
