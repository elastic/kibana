/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDataStreamsClientMock } from './data_streams_client.mock';
import { DataStreamsServiceStart } from './types';

export const createDataStreamsServiceStartMock = () => ({
  client: createDataStreamsClientMock(),
});

export const _ensureTypeCompatibility = (): DataStreamsServiceStart =>
  createDataStreamsServiceStartMock();
