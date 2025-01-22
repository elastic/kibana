/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseStreamName } from './stream_name/parse';
import { stringifyStreamName } from './stream_name/stringify';

export function isDescendantOf(parent: string, child: string) {
  const parentStreamName = parseStreamName(parent);
  const childStreamName = parseStreamName(child);
  if (parentStreamName.type === 'unknown' || childStreamName.type === 'unknown') {
    return false;
  }
  if (parentStreamName.type === 'dsns' && childStreamName.type === 'dsns') {
    return (
      childStreamName.datastreamDataset.startsWith(parentStreamName.datastreamDataset) &&
      parentStreamName.datasetSegments.length < childStreamName.datasetSegments.length
    );
  }
  if (parentStreamName.type === 'wired' && childStreamName.type === 'wired') {
    return (
      parentStreamName.segments.length < childStreamName.segments.length &&
      parentStreamName.segments.every(
        (segment, index) => segment === childStreamName.segments[index]
      )
    );
  }
  return false;
}

export function isChildOf(parent: string, child: string) {
  const parentStreamName = parseStreamName(parent);
  const childStreamName = parseStreamName(child);
  if (parentStreamName.type === 'unknown' || childStreamName.type === 'unknown') {
    return false;
  }
  if (parentStreamName.type === 'dsns' && childStreamName.type === 'dsns') {
    return (
      childStreamName.datastreamDataset.startsWith(parentStreamName.datastreamDataset) &&
      parentStreamName.datasetSegments.length + 1 === childStreamName.datasetSegments.length
    );
  }
  if (parentStreamName.type === 'wired' && childStreamName.type === 'wired') {
    return (
      parentStreamName.segments.length + 1 === childStreamName.segments.length &&
      parentStreamName.segments.every(
        (segment, index) => segment === childStreamName.segments[index]
      )
    );
  }
  return false;
}

export function getParentId(id: string) {
  const streamName = parseStreamName(id);
  if (streamName.type === 'unknown') {
    return undefined;
  }
  if (streamName.type === 'dsns') {
    const datasetSegments = streamName.datasetSegments;
    if (datasetSegments.length === 1) {
      return undefined;
    }
    return stringifyStreamName({
      type: 'dsns',
      datastreamType: streamName.datastreamType,
      datastreamNamespace: streamName.datastreamNamespace,
      datasetSegments: datasetSegments.slice(0, datasetSegments.length - 1),
    });
  }
  if (streamName.segments.length === 1) {
    return undefined;
  }
  return stringifyStreamName({
    type: 'wired',
    segments: streamName.segments.slice(0, streamName.segments.length - 1),
  });
}

export function isWiredRoot(id: string) {
  const streamName = parseStreamName(id);
  return streamName.type === 'wired' && streamName.segments.length === 1;
}

export function getAncestors(id: string, unwiredRootId?: string) {
  const streamName = parseStreamName(id);
  if (streamName.type === 'unknown') {
    return [];
  }
  if (streamName.type === 'wired') {
    return streamName.segments
      .slice(0, streamName.segments.length - 1)
      .map((_, index) =>
        stringifyStreamName({ type: 'wired', segments: streamName.segments.slice(0, index + 1) })
      );
  }
  if (!unwiredRootId) {
    return [];
  }
  const unwiredRootStreamName = parseStreamName(unwiredRootId);
  if (unwiredRootStreamName.type === 'unknown' || unwiredRootStreamName.type === 'wired') {
    throw new Error('Invalid unwired root id (needs to be a dsns stream name)');
  }
  const datasetSegments = streamName.datasetSegments;
  const unwiredRootDatasetSegments = unwiredRootStreamName.datasetSegments;
  const ancestors = [];
  for (let i = datasetSegments.length - 1; i >= unwiredRootDatasetSegments.length; i--) {
    ancestors.push(
      stringifyStreamName({
        type: 'dsns',
        datastreamType: streamName.datastreamType,
        datasetSegments: datasetSegments.slice(0, i),
        datastreamNamespace: streamName.datastreamNamespace,
      })
    );
  }
  return ancestors;
}
