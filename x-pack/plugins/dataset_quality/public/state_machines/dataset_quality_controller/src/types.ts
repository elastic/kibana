/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import { DataStreamDetails } from '../../../../common/data_streams_stats/data_stream_details';
import { Direction, SortField } from '../../../hooks';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import {
  DataStreamDegradedDocsStatServiceResponse,
  DataStreamStatServiceResponse,
} from '../../../../common/data_streams_stats';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';

export interface FlyoutDataset {
  rawName: string;
  type: string;
  name: string;
  namespace: string;
  title: string;
  integration?: {
    name: string;
    title: string;
    version: string;
  };
}

interface TableCriteria {
  page: number;
  rowsPerPage: number;
  sort: {
    field: SortField;
    direction: Direction;
  };
}

export interface WithTableOptions {
  table: TableCriteria;
}

export interface WithFlyoutOptions {
  flyout: {
    dataset?: FlyoutDataset;
    datasetDetails?: DataStreamDetails;
  };
}

export interface WithDataStreamStats {
  dataStreamStats: DataStreamStat[];
}

export interface WithDegradedDocs {
  degradedDocStats: DegradedDocsStat[];
}

export type DefaultDatasetQualityControllerState = WithTableOptions &
  WithDataStreamStats &
  WithDegradedDocs &
  WithFlyoutOptions;

type DefaultDatasetQualityStateContext = DefaultDatasetQualityControllerState &
  Partial<WithFlyoutOptions>;

export type DatasetQualityControllerTypeState =
  | {
      value: 'fetchingData';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'idle';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'fetchingFlyoutData';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'fetchingData.loadingDatasets';
      context: DefaultDatasetQualityStateContext;
    }
  | {
      value: 'fetchingData.loadingDegradedDocs';
      context: DefaultDatasetQualityStateContext;
    };

export type DatasetQualityControllerContext = DatasetQualityControllerTypeState['context'];

export type DatasetQualityControllerEvent =
  | {
      type: 'UPDATE_TABLE_CRITERIA';
      criteria: TableCriteria;
    }
  | {
      type: 'OPEN_FLYOUT';
      dataset: FlyoutDataset;
    }
  | {
      type: 'CLOSE_FLYOUT';
    }
  | DoneInvokeEvent<DataStreamDegradedDocsStatServiceResponse>
  | DoneInvokeEvent<DataStreamStatServiceResponse>
  | DoneInvokeEvent<Error>;
