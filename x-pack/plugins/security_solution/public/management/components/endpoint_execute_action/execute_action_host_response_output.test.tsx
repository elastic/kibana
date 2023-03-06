/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
} from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ExecuteActionHostResponseOutput,
  type ExecuteActionHostResponseOutputProps,
} from './execute_action_host_response_output';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { getDeferred } from '../../mocks/utils';
import { waitFor } from '@testing-library/react';
import type { IHttpFetchError } from '@kbn/core-http-browser';

describe('When using the `ExecuteActionHostResponseOutput` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: ExecuteActionHostResponseOutputProps;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(appTestContext.coreStart.http);

    renderProps = {
      action: new EndpointActionGenerator('seed').generateActionDetails<
        ResponseActionExecuteOutputContent,
        ResponseActionsExecuteParameters
      >({ command: 'execute' }),
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<ExecuteActionHostResponseOutput {...renderProps} />);
      return renderResult;
    };
  });

  it('should show execute output and execute errors', async () => {
    render();
    expect(renderResult.getByTestId('test')).toBeTruthy();
  });

  it('should show loading when details are fetching', async () => {
    (renderProps.action as ActionDetails).outputs = {};

    const deferred = getDeferred();

    apiMocks.responseProvider.actionDetails.mockDelay.mockReturnValue(deferred.promise);
    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';

    render();
    expect(renderResult.getByTestId('test-loading')).toBeTruthy();

    // Release the `action details` api
    deferred.resolve();

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
        path: '/api/endpoint/action/123',
      });
    });
    expect(renderResult.queryByTestId('test-loading')).toBeNull();
    expect(renderResult.getByTestId('test')).toBeTruthy();
  });

  it('should show nothing when no output in action details', () => {
    (renderProps.action as ActionDetails).outputs = {};
    render();
    expect(renderResult.queryByTestId('test')).toBeNull();
  });

  it('should handle API error', async () => {
    (renderProps.action as ActionDetails).outputs = {};
    const error = { message: 'server error', response: { status: 500 } } as IHttpFetchError;

    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';
    apiMocks.responseProvider.actionDetails.mockImplementation(() => {
      throw error;
    });

    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('test-apiError')).toHaveTextContent('server error');
    });
  });
});
