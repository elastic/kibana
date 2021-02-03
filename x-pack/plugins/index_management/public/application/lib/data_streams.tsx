/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataStream } from '../../../common';

export const isFleetManaged = (dataStream: DataStream): boolean => {
  // TODO check if the wording will change to 'fleet'
  return Boolean(dataStream._meta?.managed && dataStream._meta?.managed_by === 'ingest-manager');
};

export const filterDataStreams = (
  dataStreams: DataStream[],
  visibleTypes: string[]
): DataStream[] => {
  return dataStreams.filter((dataStream: DataStream) => {
    // include all data streams that are neither hidden nor managed
    if (!dataStream.hidden && !isFleetManaged(dataStream)) {
      return true;
    }
    if (dataStream.hidden && visibleTypes.includes('hidden')) {
      return true;
    }
    return isFleetManaged(dataStream) && visibleTypes.includes('managed');
  });
};

export const isSelectedDataStreamHidden = (
  dataStreams: DataStream[],
  selectedDataStreamName?: string
): boolean => {
  return (
    !!selectedDataStreamName &&
    !!dataStreams.find((dataStream: DataStream) => dataStream.name === selectedDataStreamName)
      ?.hidden
  );
};
