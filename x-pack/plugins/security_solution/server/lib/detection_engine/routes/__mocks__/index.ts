/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SIGNALS_INDEX, SIGNALS_INDEX_KEY } from '../../../../../common/constants';
import { requestContextMock } from './request_context';
import { serverMock } from './server';
import { requestMock } from './request';
import { responseMock } from './response_factory';
import { ConfigType } from '../../../../config';

export { requestMock, requestContextMock, responseMock, serverMock };

export const createMockConfig = (): ConfigType => ({
  enabled: true,
  [SIGNALS_INDEX_KEY]: DEFAULT_SIGNALS_INDEX,
  maxRuleImportExportSize: 10000,
  maxRuleImportPayloadBytes: 10485760,
  maxTimelineImportExportSize: 10000,
  maxTimelineImportPayloadBytes: 10485760,
  enableExperimental: [],
  endpointResultListDefaultFirstPageIndex: 0,
  endpointResultListDefaultPageSize: 10,
  packagerTaskInterval: '60s',
  alertMergeStrategy: 'missingFields',
  alertIgnoreFields: [],
  prebuiltRulesFromFileSystem: true,
  prebuiltRulesFromSavedObjects: false,
});

export const mockGetCurrentUser = {
  user: {
    username: 'mockUser',
  },
};
