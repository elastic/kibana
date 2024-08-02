/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation as _useMutation } from '@tanstack/react-query';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import type { RenderHookResult } from '@testing-library/react-hooks/src/types';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import {
  useSendScanRequest,
  type ScanRequestCustomOptions,
  type UseSendScanRequestResult,
} from './use_send_scan_request';
import { SCAN_ROUTE } from '../../../../common/endpoint/constants';
import type { ScanActionRequestBody } from '../../../../common/api/endpoint';
const useMutationMock = _useMutation as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useMutation: jest.fn((...args) => actualReactQueryModule.useMutation(...args)),
  };
});

const scanPayload: ScanActionRequestBody = {
  endpoint_ids: ['test-endpoint-id'],
  agent_type: 'endpoint',
  parameters: { path: '/test/path' },
};

describe('When using the `useSendScanRequest()` hook', () => {
  let customOptions: ScanRequestCustomOptions;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let renderHook: () => RenderHookResult<ScanRequestCustomOptions, UseSendScanRequestResult>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    http = testContext.coreStart.http;
    apiMocks = responseActionsHttpMocks(http);
    customOptions = {};

    renderHook = () => {
      return testContext.renderHook(() => useSendScanRequest(customOptions));
    };
  });

  it('should call the `scan` API with correct payload', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    await mutateAsync(scanPayload);

    expect(apiMocks.responseProvider.scan).toHaveBeenCalledWith({
      body: JSON.stringify(scanPayload),
      path: SCAN_ROUTE,
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be passed to ReactQuery', async () => {
    customOptions.mutationKey = ['pqr-abc'];
    customOptions.cacheTime = 10;
    renderHook();

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), customOptions);
  });
});
