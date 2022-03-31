/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { HostIsolationExceptionsList } from './host_isolation_exceptions_list';

describe('When on the host isolation exceptions page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () => (renderResult = mockedContext.render(<HostIsolationExceptionsList />));

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });

  it.todo('should search using expected exception item fields');
});
