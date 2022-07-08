/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../test';
import { DynamicTreeView } from '.';
import { clusterResponseMock, nodeResponseMock } from './mocks';

describe('DynamicTreeView component', () => {
  let render: (props?: any) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const waitForApiCall = () => waitFor(() => expect(mockedApi).toHaveBeenCalled());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    mockedApi.mockResolvedValue(clusterResponseMock);
    render = (props) =>
      (renderResult = mockedContext.render(
        <DynamicTreeView
          query={{
            bool: {
              filter: [],
              must: [],
              must_not: [],
              should: [],
            },
          }}
          indexPattern={'*-logs'}
          tree={[
            {
              key: 'cluster',
              name: 'cluster',
              namePlural: 'clusters',
              type: 'cluster',
              iconProps: {
                type: 'cluster',
              },
            },
          ]}
          aria-label="Logical Tree View"
          onSelect={(selectionDepth, key, type) => {}}
          {...props}
        />
      ));
  });

  describe('When DynamicTreeView is mounted', () => {
    it('should show loading state while retrieving empty data and hide it when settled', async () => {
      render();
      expect(renderResult.queryByText(/loading/i)).toBeInTheDocument();
      await waitForApiCall();
      expect(renderResult.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  describe('DynamicTreeView parent level', () => {
    const key = 'cluster-test';
    const tree = [
      {
        key,
        name: 'cluster',
        namePlural: 'clusters',
        type: 'cluster',
        iconProps: {
          type: 'cluster',
        },
      },
    ];

    it('should make a api call with group based on tree parameters', async () => {
      render({
        tree,
      });
      await waitForApiCall();

      expect(mockedApi).toHaveBeenCalledWith('/internal/kubernetes_security/aggregate', {
        query: {
          groupBy: key,
          index: '*-logs',
          page: 0,
          perPage: 50,
          query: '{"bool":{"filter":[],"must":[],"must_not":[],"should":[]}}',
        },
      });
    });

    it('should render the parent level based on api response', async () => {
      render({
        tree,
      });
      await waitForApiCall();

      ['awp-demo-gke-main', 'awp-demo-gke-test'].forEach((cluster) => {
        expect(renderResult.queryByText(cluster)).toBeInTheDocument();
      });
    });

    it('should trigger a callback when tree node is clicked', async () => {
      const callback = jest.fn();
      render({ tree, onSelect: callback });
      await waitForApiCall();

      renderResult.getByRole('button', { name: 'awp-demo-gke-main' }).click();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('DynamicTreeView children', () => {
    const tree = [
      {
        key: 'cluster',
        name: 'cluster',
        namePlural: 'clusters',
        type: 'cluster',
        iconProps: {
          type: 'cluster',
        },
      },
      {
        key: 'node',
        name: 'node',
        namePlural: 'nodes',
        type: 'node',
        iconProps: {
          type: 'node',
        },
      },
    ];

    const parent = 'awp-demo-gke-main';

    it('should make a children api call with filter when parent is expanded', async () => {
      render({ tree });
      await waitForApiCall();
      renderResult.getByRole('button', { name: parent }).click();

      mockedApi.mockResolvedValueOnce(nodeResponseMock);

      await waitForApiCall();
      expect(mockedApi).toHaveBeenCalledWith('/internal/kubernetes_security/aggregate', {
        query: {
          groupBy: 'node',
          index: '*-logs',
          page: 0,
          perPage: 50,
          query: `{"bool":{"filter":[{"term":{"cluster":"${parent}"}}],"must":[],"must_not":[],"should":[]}}`,
        },
      });
    });

    it('should render children when parent is expanded based on api request', async () => {
      render({ tree });
      await waitForApiCall();

      renderResult.getByRole('button', { name: parent }).click();

      mockedApi.mockResolvedValueOnce(nodeResponseMock);

      // check if children has loading state
      expect(renderResult.queryByText(/loading/i)).toBeInTheDocument();
      await waitForApiCall();

      ['default', 'kube-system', 'production', 'qa', 'staging'].forEach((node) => {
        expect(renderResult.queryByText(node)).toBeInTheDocument();
      });
    });
  });
});
