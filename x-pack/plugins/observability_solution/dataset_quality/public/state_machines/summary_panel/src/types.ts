/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import { GetDataStreamsEstimatedDataInBytesResponse } from '../../../../common/data_streams_stats';

export interface Retries {
  estimatedDataRetries: number;
}

export interface EstimatedDataDetails {
  estimatedDataInBytes: number;
}

export interface WithEstimatedData {
  estimatedData: EstimatedDataDetails;
}

export interface WithRetries {
  retries: Retries;
}

export type DefaultDatasetsSummaryPanelContext = WithEstimatedData & WithRetries;

export type DatasetsSummaryPanelState =
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
    }
  | {
      value: 'estimatedData.disabled';
      context: DefaultDatasetsSummaryPanelContext;
    };

export type DatasetSummaryPanelEvent =
  | DoneInvokeEvent<Retries>
  | DoneInvokeEvent<GetDataStreamsEstimatedDataInBytesResponse>
  | DoneInvokeEvent<Error>;

export type DatasetsSummaryPanelContext = DatasetsSummaryPanelState['context'];
