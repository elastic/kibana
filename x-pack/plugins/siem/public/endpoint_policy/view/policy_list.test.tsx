/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PolicyList } from './index';
import { AppContextTestRender, createAppRootMockRenderer } from '../../common/mock/endpoint';

describe('when on the policies page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store, coreStart, middlewareSpy } = mockedContext);
    render = () => mockedContext.render(<PolicyList />);
  });

  it('should show a table', async () => {
    const renderResult = render();
    const table = await renderResult.findByTestId('policyTable');
    expect(table).not.toBeNull();
  });
});
