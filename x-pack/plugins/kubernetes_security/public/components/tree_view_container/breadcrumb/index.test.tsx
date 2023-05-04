/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../test';
import { KubernetesCollectionMap } from '../../../types';
import { Breadcrumb } from '.';

const MOCK_TREE_SELECTION: KubernetesCollectionMap = {
  clusterId: 'selected cluster id',
  clusterName: 'selected cluster name',
  namespace: 'selected namespace',
  node: 'selected node',
  pod: 'selected pod',
  containerImage: 'selected image',
};

describe('Tree view Breadcrumb component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let onSelect: jest.Mock;
  let onResponseActionButtonClick: jest.Mock;
  const responseActionButtonProps = {
    tooltip: { content: 'test' },
    isDisabled: false,
    canAccessResponseConsole: true,
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    onSelect = jest.fn();
    onResponseActionButtonClick = jest.fn();
  });

  describe('When Breadcrumb is mounted', () => {
    it('renders Breadcrumb button content correctly', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavResponseActionDisabled={false}
          treeNavSelection={{ ...MOCK_TREE_SELECTION, node: undefined }}
          responseActionClick={onResponseActionButtonClick}
          responseActionButtonProps={responseActionButtonProps}
          onSelect={onSelect}
        />
      );

      expect(renderResult.queryByText(MOCK_TREE_SELECTION.clusterName!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.namespace!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.node!)).toBeFalsy();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.pod!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.containerImage!)).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });

    it('should render breadcrumb icons', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          responseActionClick={onResponseActionButtonClick}
          treeNavResponseActionDisabled={false}
          treeNavSelection={MOCK_TREE_SELECTION}
          responseActionButtonProps={responseActionButtonProps}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByTestId('kubernetesSecurityBreadcrumbIcon-clusterId')
      ).toBeVisible();
      expect(renderResult.queryByTestId('kubernetesSecurityBreadcrumbIcon-node')).toBeVisible();
      expect(renderResult.queryByTestId('kubernetesSecurityBreadcrumbIcon-pod')).toBeVisible();
      expect(
        renderResult.queryByTestId('kubernetesSecurityBreadcrumbIcon-containerImage')
      ).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });
    it('returns null when no selected collection', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          responseActionClick={onResponseActionButtonClick}
          treeNavResponseActionDisabled={false}
          treeNavSelection={{}}
          responseActionButtonProps={responseActionButtonProps}
          onSelect={onSelect}
        />
      );
      expect(renderResult.container).toBeEmptyDOMElement();
    });

    it('should display cluster icon button when no cluster name is provided', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavResponseActionDisabled={false}
          responseActionClick={onResponseActionButtonClick}
          treeNavSelection={{
            ...MOCK_TREE_SELECTION,
            clusterName: undefined,
            node: undefined,
          }}
          responseActionButtonProps={responseActionButtonProps}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByTestId('kubernetesSecurityBreadcrumbIcon-clusterId')
      ).toBeVisible();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.clusterId!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.containerImage!)).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });

    it('should return null when no cluster in selection', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavResponseActionDisabled={false}
          responseActionClick={onResponseActionButtonClick}
          treeNavSelection={{ ...MOCK_TREE_SELECTION, clusterId: undefined }}
          responseActionButtonProps={responseActionButtonProps}
          onSelect={onSelect}
        />
      );

      expect(renderResult.container).toBeEmptyDOMElement();
    });

    it('clicking on breadcrumb item triggers onSelect', async () => {
      const mockPodNavSelection = {
        clusterId: 'selected cluster id',
        clusterName: 'selected cluster name',
        namespace: 'selected namespace',
        node: 'selected node',
        pod: 'selected pod',
      };
      renderResult = mockedContext.render(
        <Breadcrumb
          responseActionClick={onResponseActionButtonClick}
          treeNavResponseActionDisabled={false}
          treeNavSelection={mockPodNavSelection}
          onSelect={onSelect}
          responseActionButtonProps={responseActionButtonProps}
        />
      );
      expect(renderResult.queryByText(mockPodNavSelection.pod)).toBeVisible();
      renderResult.getByText(mockPodNavSelection.pod).click();
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should render last  breadcrumb content only', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavResponseActionDisabled={true}
          responseActionClick={onResponseActionButtonClick}
          treeNavSelection={{
            clusterId: MOCK_TREE_SELECTION.clusterId,
            clusterName: MOCK_TREE_SELECTION.clusterName,
            node: MOCK_TREE_SELECTION.node,
            containerImage: MOCK_TREE_SELECTION.containerImage,
          }}
          onSelect={onSelect}
          responseActionButtonProps={responseActionButtonProps}
        />
      );

      expect(renderResult.queryByText(MOCK_TREE_SELECTION.clusterName!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.namespace!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.node!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.pod!)).toBeNull();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION.containerImage!)).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });
  });
});
