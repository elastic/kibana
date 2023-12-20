/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../test';
import { clusterResponseMock } from '../mocks';
import { TreeNav } from '.';
import { TreeViewContextProvider } from '../contexts';

describe('TreeNav component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const defaultProps = {
    globalFilter: {
      startDate: Date.now().toString(),
      endDate: (Date.now() + 1).toString(),
    },
    onSelect: () => {},
    hasSelection: false,
  };

  const TreeNavContainer = () => (
    <TreeViewContextProvider {...defaultProps}>
      <TreeNav />
    </TreeViewContextProvider>
  );

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    mockedApi.mockResolvedValue(clusterResponseMock);
  });

  it('mount with Logical View selected by default', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);
    const elemLabel = await renderResult.getByTestId('treeNavType_generated-idlogical');
    expect(elemLabel).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the tree path according with the selected view type', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);

    const logicalViewPath = 'cluster / namespace / pod / container image';
    const logicViewButton = renderResult.getByTestId('treeNavType_generated-idlogical');
    expect(logicViewButton).toHaveAttribute('aria-pressed', 'true');
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();

    const infraStructureViewRadio = renderResult.getByTestId(
      'treeNavType_generated-idinfrastructure'
    );
    infraStructureViewRadio.click();

    expect(renderResult.getByText('cluster / node / pod / container image')).toBeInTheDocument();

    logicViewButton.click();
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();
  });

  it('collapses / expands the tree nav when clicking on collapse button', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);

    expect(renderResult.getByText(/cluster/i)).toBeVisible();

    const collapseButton = await renderResult.getByLabelText(/collapse/i);
    collapseButton.click();
    expect(renderResult.getByText(/cluster/i)).not.toBeVisible();

    const expandButton = await renderResult.getByLabelText(/expand/i);
    expandButton.click();
    expect(renderResult.getByText(/cluster/i)).toBeVisible();
  });
});
