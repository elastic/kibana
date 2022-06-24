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
  [KubernetesCollection.cluster]: 'selected cluster',
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
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.cluster]!)
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

    it('returns null when no cluster in selection', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{ ...MOCK_TREE_SELECTION, [KubernetesCollection.cluster]: undefined }}
          onSelect={onSelect}
        />
      );

      expect(renderResult.container).toBeEmptyDOMElement();
    });

    it('renders provided collections only', async () => {
      renderResult = mockedContext.render(
        <Breadcrumb
          treeNavSelection={{
            [KubernetesCollection.cluster]: MOCK_TREE_SELECTION[KubernetesCollection.cluster],
            [KubernetesCollection.node]: MOCK_TREE_SELECTION[KubernetesCollection.node],
            [KubernetesCollection.containerImage]:
              MOCK_TREE_SELECTION[KubernetesCollection.containerImage],
          }}
          onSelect={onSelect}
        />
      );

      expect(
        renderResult.queryByText(MOCK_TREE_SELECTION[KubernetesCollection.cluster]!)
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
