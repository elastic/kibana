/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import {
  DataStreamDegradedDocsStatServiceResponse,
  GetDataStreamsEstimatedDataInBytesResponse,
} from '../../../../common/data_streams_stats';

export interface DatasetsQuality {
  percentages: number[];
}

export interface DatasetsActivityDetails {
  total: number;
  active: number;
}

export interface EstimatedDataDetails {
  estimatedDataInBytes: number;
}

export interface WithDatasetsQuality {
  datasetsQuality: DatasetsQuality;
}

export interface WithActiveDatasets {
  datasetsActivity: DatasetsActivityDetails;
}

export interface WithEstimatedData {
  estimatedData: EstimatedDataDetails;
}

export type DefaultDatasetsSummaryPanelContext = WithDatasetsQuality &
  WithActiveDatasets &
  WithEstimatedData;

export type DatasetsSummaryPanelState =
  | {
      value: 'datasetsQuality.fetching';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'datasetsQuality.loaded';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'datasetsActivity.fetching';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'datasetsActivity.loaded';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'estimatedData.fetching';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'estimatedData.loaded';
      context: DefaultDatasetsSummaryPanelContext;
    };

export type DatasetSummaryPanelEvent =
  | DoneInvokeEvent<DatasetsQuality>
  | DoneInvokeEvent<DatasetsActivityDetails>
  | DoneInvokeEvent<DataStreamDegradedDocsStatServiceResponse>
  | DoneInvokeEvent<GetDataStreamsEstimatedDataInBytesResponse>
  | DoneInvokeEvent<Error>;

export type DatasetsSummaryPanelContext = DatasetsSummaryPanelState['context'];
