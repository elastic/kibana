/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../test';
import { TreeNav } from '.';

describe('TreeNav component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  const defaultProps = {
    globalFilter: {
      startDate: Date.now().toString(),
      endDate: (Date.now() + 1).toString(),
    },
    onSelect: () => {},
    hasSelection: false,
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  it('mount with Logical View selected by default', async () => {
    renderResult = mockedContext.render(<TreeNav {...defaultProps} />);
    const elemLabel = await renderResult.getByDisplayValue(/logical/i);
    expect(elemLabel).toBeChecked();
  });

  it('shows the tree path according with the selected view type', async () => {
    renderResult = mockedContext.render(<TreeNav {...defaultProps} />);

    const logicalViewPath = 'cluster / namespace / pod / container image';
    const logicViewRadio = await renderResult.getByDisplayValue(/logical/i);
    expect(logicViewRadio).toBeChecked();
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();

    const infraStructureViewRadio = await renderResult.getByDisplayValue(/infrastructure/i);
    infraStructureViewRadio.click();

    expect(renderResult.getByText('cluster / node / pod / container image')).toBeInTheDocument();

    logicViewRadio.click();
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();
  });
});
