/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { CheckTimeRange, DataStream } from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';
import { DataStreamQualityChecksStateProvider } from './state_machine_provider';

export interface DataStreamQualityCheckerProps {
  dataStream: string;
  timeRange: CheckTimeRange;
}

export const createDataStreamQualityChecker = ({
  dataStreamQualityClient,
}: {
  dataStreamQualityClient: IDataStreamQualityClient;
}) =>
  React.memo(({ dataStream, timeRange }: DataStreamQualityCheckerProps) => {
    const [initialParameters] = useState(() => ({
      dataStream,
      timeRange,
    }));

    const [dependencies] = useState(() => ({
      dataStreamQualityClient,
    }));

    return (
      <DataStreamQualityChecksStateProvider
        key={`${initialParameters.dataStream}-${initialParameters.timeRange.start}-${initialParameters.timeRange.end}`}
        initialParameters={initialParameters}
        dependencies={dependencies}
      >
        <ConnectedDataStreamQualityCheckerContent />
      </DataStreamQualityChecksStateProvider>
    );
  });

const ConnectedDataStreamQualityCheckerContent = () => <>Content</>;
