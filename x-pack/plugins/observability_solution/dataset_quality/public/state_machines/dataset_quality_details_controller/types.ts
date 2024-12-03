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
  DataStreamRolloverResponse,
  DataStreamSettings,
  DegradedField,
  DegradedFieldAnalysis,
  DegradedFieldResponse,
  DegradedFieldValues,
  NonAggregatableDatasets,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';
import { TableCriteria, TimeRangeConfig } from '../../../common/types';
import { IntegrationType } from '../../../common/data_stream_details';

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

export interface FieldLimit {
  newFieldLimit?: number;
  result?: UpdateFieldLimitResponse;
  error?: boolean;
}

export interface WithDefaultControllerState {
  dataStream: string;
  degradedFields: DegradedFieldsTableConfig;
  timeRange: TimeRangeConfig;
  showCurrentQualityIssues: boolean;
  breakdownField?: string;
  isBreakdownFieldEcs?: boolean;
  isIndexNotFoundError?: boolean;
  integration?: IntegrationType;
  expandedDegradedField?: string;
  isNonAggregatable?: boolean;
  fieldLimit?: FieldLimit;
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
  integration: IntegrationType;
}

export interface WithIntegrationDashboards {
  integrationDashboards: Dashboard[];
}

export interface WithDegradedFieldValues {
  degradedFieldValues: DegradedFieldValues;
}

export interface WithDegradeFieldAnalysis {
  degradedFieldAnalysis: DegradedFieldAnalysis;
}

export interface WithNewFieldLimit {
  fieldLimit?: FieldLimit & {
    newFieldLimit: number;
  };
}

export interface WithNewFieldLimitResponse {
  fieldLimit: FieldLimit;
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
        | 'initializing.dataStreamDetails.fetching'
        | 'initializing.dataStreamSettings.fetchingDataStreamSettings'
        | 'initializing.dataStreamSettings.errorFetchingDataStreamSettings'
        | 'initializing.checkAndLoadIntegrationAndDashboards.checkingAndLoadingIntegration';
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
      value:
        | 'initializing.dataStreamSettings.fetchingDataStreamDegradedFields'
        | 'initializing.dataStreamSettings.errorFetchingDegradedFields';
      context: WithDefaultControllerState & WithDataStreamSettings;
    }
  | {
      value: 'initializing.dataStreamSettings.doneFetchingDegradedFields';
      context: WithDefaultControllerState & WithDataStreamSettings & WithDegradedFieldsData;
    }
  | {
      value:
        | 'initializing.checkAndLoadIntegrationAndDashboards.loadingIntegrationDashboards'
        | 'initializing.checkAndLoadIntegrationAndDashboards.unauthorizedToLoadDashboards';
      context: WithDefaultControllerState & WithIntegration;
    }
  | {
      value: 'initializing.checkAndLoadIntegrationAndDashboards.done';
      context: WithDefaultControllerState & WithIntegration & WithIntegrationDashboards;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open';
      context: WithDefaultControllerState;
    }
  | {
      value:
        | 'initializing.degradedFieldFlyout.open.initialized.ignoredValues.fetching'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.analyzing';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.initialized.ignoredValues.done';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradedFieldValues;
    }
  | {
      value:
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.analyzed'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.mitigating'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.askingForRollover'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.rollingOver'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.success'
        | 'initializing.degradedFieldFlyout.open.initialized.mitigation.error';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradeFieldAnalysis;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.initialized.mitigation.success';
      context: WithDefaultControllerState &
        WithDegradedFieldsData &
        WithDegradedFieldValues &
        WithDegradeFieldAnalysis &
        WithNewFieldLimit &
        WithNewFieldLimitResponse;
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
  | {
      type: 'SET_NEW_FIELD_LIMIT';
      newFieldLimit: number;
    }
  | {
      type: 'ROLLOVER_DATA_STREAM';
    }
  | DoneInvokeEvent<NonAggregatableDatasets>
  | DoneInvokeEvent<DataStreamDetails>
  | DoneInvokeEvent<Error>
  | DoneInvokeEvent<boolean>
  | DoneInvokeEvent<DegradedFieldResponse>
  | DoneInvokeEvent<DegradedFieldValues>
  | DoneInvokeEvent<DataStreamSettings>
  | DoneInvokeEvent<Dashboard[]>
  | DoneInvokeEvent<DegradedFieldAnalysis>
  | DoneInvokeEvent<UpdateFieldLimitResponse>
  | DoneInvokeEvent<DataStreamRolloverResponse>
  | DoneInvokeEvent<IntegrationType>;
