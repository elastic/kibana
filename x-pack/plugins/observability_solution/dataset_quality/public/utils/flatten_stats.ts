/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamType } from '../../common/types';

export function flattenStats<T>(
  stats: Record<DataStreamType, T[]>
): Array<T & { type: DataStreamType }> {
  return Object.entries(stats).flatMap(([type, dataStreams]) =>
    dataStreams.map((dataStream) => ({ ...dataStream, type: type as DataStreamType }))
  );
}
