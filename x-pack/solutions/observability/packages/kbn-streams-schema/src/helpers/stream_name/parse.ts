/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamName } from './types';

export function isDSNS(stream: string) {
  return stream.match(/^[^-]+-[^-]+-[^-]+$/);
}

export function parseStreamName(stream: string): StreamName {
  if (isDSNS(stream)) {
    const [datastreamType, datastreamDataset, datastreamNamespace] = stream.split('-');
    return {
      type: 'dsns',
      name: stream,
      datastreamType,
      datastreamDataset,
      datastreamNamespace,
      datasetSegments: datastreamDataset.split('.'),
    };
  }

  const segments = stream.split('.');
  if (segments[0] === 'logs') {
    return {
      type: 'wired',
      name: stream,
      segments,
    };
  }

  return {
    type: 'unknown',
    name: stream,
  };
}
