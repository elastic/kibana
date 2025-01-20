/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DSNSStreamName, UnknownStreamName, WiredStreamName } from './types';

export function stringifyStreamName(
  streamName:
    | UnknownStreamName
    | Omit<WiredStreamName, 'name'>
    | Omit<DSNSStreamName, 'name' | 'datastreamDataset'>
) {
  if (streamName.type === 'unknown') {
    return streamName.name;
  }
  if (streamName.type === 'wired') {
    return streamName.segments.join('.');
  }
  return `${streamName.datastreamType}-${streamName.datasetSegments.join('.')}-${
    streamName.datastreamNamespace
  }`;
}
