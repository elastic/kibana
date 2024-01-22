/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import { DIRECTION, SORT_FIELD } from '../../../hooks';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import {
  DataStreamDegradedDocsStatServiceResponse,
  DataStreamStatServiceResponse,
} from '../../../../common/data_streams_stats';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';

interface WithTableOptions {
  table: {
    page: number;
    rowsPerPage: number;
    sort: {
      field: SORT_FIELD;
      direction: DIRECTION;
    };
  };
}

interface WithDataStreamStats {
  dataStreamStats: DataStreamStat[];
}
interface WithDegradedDocs {
  degradedDocStats: DegradedDocsStat[];
}

export type DefaultDatasetQualityControllerState = WithTableOptions &
  WithDataStreamStats &
  WithDegradedDocs;

type DefaultDatasetQualityStateContext = DefaultDatasetQualityControllerState;

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
      type: 'CHANGE_PAGE';
      page: number;
    }
  | {
      type: 'CHANGE_ROWS_PER_PAGE';
      rowsPerPage: number;
    }
  | {
      type: 'CHANGE_SORT';
      sort: {
        field: SORT_FIELD;
        direction: DIRECTION;
      };
    }
  | DoneInvokeEvent<DataStreamDegradedDocsStatServiceResponse>
  | DoneInvokeEvent<DataStreamStatServiceResponse>;
