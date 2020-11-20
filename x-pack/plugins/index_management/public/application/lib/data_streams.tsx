/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataStream } from '../../../common';

export const isManagedByIngestManager = (dataStream: DataStream): boolean => {
  return Boolean(dataStream._meta?.managed && dataStream._meta?.managed_by === 'ingest-manager');
};

export const filterDataStreams = (dataStreams: DataStream[]): DataStream[] => {
  return dataStreams.filter((dataStream: DataStream) => !isManagedByIngestManager(dataStream));
};
