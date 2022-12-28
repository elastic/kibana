/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { FormattedError } from './formatted_error';

describe('When using the `FormattedError` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let error: Error;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    render = () =>
      (renderResult = mockedContext.render(<FormattedError error={error} data-test-subj="test" />));
    error = new Error('foo');
  });

  it('should display the error message for normal errors', () => {
    render();

    expect(renderResult.getByTestId('test').textContent).toEqual('foo');
  });

  it('should display status code, message and API response body for IHttpFetchError', () => {
    const httpError = new Error('api foo') as IHttpFetchError;
    Object.assign(httpError, {
      name: 'foo',
      request: {} as Request,
      response: {
        status: '400',
        statusText: 'some 400 error',
      } as unknown as Response,
      body: { message: 'something bad happen', at: 'some place' },
    });
    error = httpError;
    render();

    expect(renderResult.getByTestId('test').textContent).toEqual(
      '400: some 400 errormessage: something bad happenat: some place'
    );
  });
});
