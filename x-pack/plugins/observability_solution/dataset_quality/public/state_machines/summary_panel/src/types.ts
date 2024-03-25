/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import { GetDataStreamsEstimatedDataInBytesResponse } from '../../../../common/data_streams_stats';

export interface Retries {
  datasetsQualityRetries: number;
  datasetsActivityRetries: number;
  estimatedDataRetries: number;
}

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

export interface WithRetries {
  retries: Retries;
}

export type DefaultDatasetsSummaryPanelContext = WithDatasetsQuality &
  WithActiveDatasets &
  WithEstimatedData &
  WithRetries;

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
      value: 'datasetsQuality.retrying';
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
      value: 'datasetsActivity.retrying';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'estimatedData.fetching';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'estimatedData.loaded';
      context: DefaultDatasetsSummaryPanelContext;
    }
  | {
      value: 'estimatedData.retrying';
      context: DefaultDatasetsSummaryPanelContext;
    };

export type DatasetSummaryPanelEvent =
  | DoneInvokeEvent<Retries>
  | DoneInvokeEvent<DatasetsQuality>
  | DoneInvokeEvent<DatasetsActivityDetails>
  | DoneInvokeEvent<GetDataStreamsEstimatedDataInBytesResponse>
  | DoneInvokeEvent<Error>;

export type DatasetsSummaryPanelContext = DatasetsSummaryPanelState['context'];
