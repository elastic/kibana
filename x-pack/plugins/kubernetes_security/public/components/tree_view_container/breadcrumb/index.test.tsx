/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../test';
import { KubernetesCollection, TreeNavSelection } from '../../../types';
import { Breadcrumb } from '.';

const MOCK_TREE_SELECTION: TreeNavSelection = {
  [KubernetesCollection.clusterId]: 'selected cluster id',
  [KubernetesCollection.clusterName]: 'selected cluster name',
  [KubernetesCollection.namespace]: 'selected namespace',
  [KubernetesCollection.node]: 'selected node',
  [KubernetesCollection.pod]: 'selected pod',
  [KubernetesCollection.containerImage]: 'selected image',
};

describe('Tree view Breadcrumb component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let onSelect: jest.Mock;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    onSelect = jest.fn();
  });

  describe('When Breadcrumb is mounted', () => {
    it('renders Breadcrumb correctly', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{ ...MOCK_TREE_SELECTION, [KubernetesCollection.node]: undefined }}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.clusterName]!)
      ).toBeVisible();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.namespace]!)
      ).toBeVisible();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.node]!)).toBeFalsy();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.pod]!)
      ).toBeVisible();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.containerImage]!)
      ).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });

    it('returns null when no selected collection', async () => {
      renderResult = mockedContext.render(<Breadcrumb treeNavSelection={{}} onSelect={onSelect} />);

      expect(renderResult.container).toBeEmptyDOMElement();
    });

    it('returns cluster id when no cluster name is provided', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{
            ...MOCK_TREE_SELECTION,
            [KubernetesCollection.clusterName]: undefined,
            [KubernetesCollection.node]: undefined,
          }}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.clusterId]!)
      ).toBeVisible();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.namespace]!)
      ).toBeVisible();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.node]!)).toBeFalsy();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.pod]!)
      ).toBeVisible();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.containerImage]!)
      ).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });

    it('returns null when no cluster in selection', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{ ...MOCK_TREE_SELECTION, [KubernetesCollection.clusterId]: undefined }}
          onSelect={onSelect}
        />
      );

      expect(renderResult.container).toBeEmptyDOMElement();
    });

    it('clicking on breadcrumb item triggers onSelect', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{ ...MOCK_TREE_SELECTION, [KubernetesCollection.node]: undefined }}
          onSelect={onSelect}
        />
      );

      renderResult.getByText(MOCK_TREE_SELECTION[KubernetesCollection.clusterName]!).click();
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('renders provided collections only', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{
            [KubernetesCollection.clusterId]: MOCK_TREE_SELECTION[KubernetesCollection.clusterId],
            [KubernetesCollection.clusterName]:
              MOCK_TREE_SELECTION[KubernetesCollection.clusterName],
            [KubernetesCollection.node]: MOCK_TREE_SELECTION[KubernetesCollection.node],
            [KubernetesCollection.containerImage]:
              MOCK_TREE_SELECTION[KubernetesCollection.containerImage],
          }}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.clusterName]!)
      ).toBeVisible();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.namespace]!)
      ).toBeFalsy();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.node]!)
      ).toBeVisible();
      expect(renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.pod]!)).toBeFalsy();
      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.containerImage]!)
      ).toBeVisible();
      expect(renderResult).toMatchSnapshot();
    });
  });
});
