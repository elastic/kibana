/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetsClientMock } from './datasets_client.mock';
import { DatasetsServiceStart } from './types';

export const createDatasetsServiceStartMock = () => ({
  client: createDatasetsClientMock(),
});

export const _ensureTypeCompatibility = (): DatasetsServiceStart =>
  createDatasetsServiceStartMock();
