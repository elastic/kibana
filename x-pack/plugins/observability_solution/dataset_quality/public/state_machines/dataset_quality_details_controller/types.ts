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
  DegradedFieldAnalysis,
  DegradedFieldResponse,
  DegradedFieldValues,
  FailedDocsDetails,
  FailedDocsErrors,
  NonAggregatableDatasets,
  QualityIssue,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';
import { TableCriteria, TimeRangeConfig } from '../../../common/types';
import { Integration } from '../../../common/data_streams_stats/integration';

export type QualityIssueType = QualityIssue['type'];

export interface DataStream {
  name: string;
  type: string;
  namespace: string;
  rawName: string;
}

export interface DegradedFieldsTableConfig {
  table: TableCriteria<DegradedFieldSortField>;
  data?: QualityIssue[];
}

export interface DegradedFieldsWithData {
  table: TableCriteria<DegradedFieldSortField>;
  data: QualityIssue[];
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
  qualityIssuesChart: QualityIssueType;
  breakdownField?: string;
  isBreakdownFieldEcs?: boolean;
  isIndexNotFoundError?: boolean;
  integration?: Integration;
  expandedQualityIssue?: {
    name: string;
    type: QualityIssueType;
  };
  isNonAggregatable?: boolean;
  fieldLimit?: FieldLimit;
  failedDocsErrors?: WithFailedDocsErrors['failedDocsErrors'];
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

export interface WithFailedDocsErrors {
  failedDocsErrors: {
    table: TableCriteria<keyof FailedDocsErrors['errors'][0]>;
    data?: FailedDocsErrors['errors'];
  };
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
  | 'degradedFields'
  | 'timeRange'
  | 'isIndexNotFoundError'
  | 'showCurrentQualityIssues'
  | 'qualityIssuesChart'
  | 'failedDocsErrors'
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
      value:
        | 'initializing.nonAggregatableDataset.done'
        | 'initializing.dataStreamSettings.loadingIntegrationsAndDegradedFields.dataStreamDegradedFields.fetching';
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
      context: WithDefaultControllerState &
        WithNonAggregatableDatasetStatus &
        WithDegradedFieldsData;
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
    }
  | {
      value: 'initializing.degradedFieldFlyout.open';
      context: WithDefaultControllerState;
    }
  | {
      value:
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.ignoredValues.fetching'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.analyzing';
      context: WithDefaultControllerState & WithDegradedFieldsData;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.ignoredValues.done';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradedFieldValues;
    }
  | {
      value:
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.analyzed'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.mitigating'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.askingForRollover'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.rollingOver'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.success'
        | 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.error';
      context: WithDefaultControllerState & WithDegradedFieldsData & WithDegradeFieldAnalysis;
    }
  | {
      value: 'initializing.degradedFieldFlyout.open.initialized.degradedFieldFlyout.mitigation.success';
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
      qualityIssue: {
        name: string;
        type: QualityIssueType;
      };
    }
  | {
      type: 'CLOSE_DEGRADED_FIELD_FLYOUT';
    }
  | {
      type: 'DEGRADED_FIELDS_LOADED';
    }
  | {
      type: 'QUALITY_ISSUES_CHART_CHANGE';
      qualityIssuesChart: QualityIssueType;
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
  | DoneInvokeEvent<FailedDocsDetails>
  | DoneInvokeEvent<DegradedFieldResponse>
  | DoneInvokeEvent<DegradedFieldValues>
  | DoneInvokeEvent<DataStreamSettings>
  | DoneInvokeEvent<Integration>
  | DoneInvokeEvent<Dashboard[]>
  | DoneInvokeEvent<DegradedFieldAnalysis>
  | DoneInvokeEvent<UpdateFieldLimitResponse>
  | DoneInvokeEvent<DataStreamRolloverResponse>;
