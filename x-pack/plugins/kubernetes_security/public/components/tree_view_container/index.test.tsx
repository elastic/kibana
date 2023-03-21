/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TreeViewContainer } from '.';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import * as context from './contexts';

describe('TreeNav component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const spy = jest.spyOn(context, 'useTreeViewContext');

  const defaultProps = {
    globalFilter: {
      startDate: Date.now().toString(),
      endDate: (Date.now() + 1).toString(),
    },
    renderSessionsView: <div>Session View</div>,
  } as any;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('shows empty message when there is no results', async () => {
    spy.mockImplementation(() => ({
      ...jest.requireActual('./contexts').useTreeViewContext,
      noResults: true,
    }));

    renderResult = mockedContext.render(<TreeViewContainer {...defaultProps} />);
    expect(await renderResult.getByText(/no results/i)).toBeInTheDocument();
  });
});
