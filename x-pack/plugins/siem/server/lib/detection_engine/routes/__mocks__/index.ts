/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SIGNALS_INDEX, SIGNALS_INDEX_KEY } from '../../../../../common/constants';
import { requestContextMock } from './request_context';
import { serverMock } from './server';
import { requestMock } from './request';
import { responseMock } from './response_factory';

export { requestMock, requestContextMock, responseMock, serverMock };

export const createMockConfig = () => ({
  enabled: true,
  [SIGNALS_INDEX_KEY]: DEFAULT_SIGNALS_INDEX,
  maxImportPayloadBytes: 10485760,
  maxImportExportSize: 10000,
});
