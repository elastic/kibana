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
import { clusterResponseMock, nodeResponseMock } from '../mocks';
import { TreeViewContextProvider } from '../contexts';

describe('DynamicTreeView component', () => {
  let render: (props?: any) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const defaultProps = {
    globalFilter: {
      startDate: Date.now().toString(),
      endDate: (Date.now() + 1).toString(),
    },
    indexPattern: {
      title: '*-logs',
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    mockedApi.mockResolvedValue(clusterResponseMock);
    render = (props) =>
      (renderResult = mockedContext.render(
        <TreeViewContextProvider {...defaultProps}>
          <DynamicTreeView
            query={{
              bool: {
                filter: [],
                must: [],
                must_not: [],
                should: [],
              },
            }}
            tree={[
              {
                key: 'clusterId',
                name: 'clusterId',
                namePlural: 'clusters',
                type: 'clusterId',
                iconProps: {
                  type: 'cluster',
                },
              },
            ]}
            onSelect={(selectionDepth, key, type) => {}}
            {...props}
          />
        </TreeViewContextProvider>
      ));
  });

  describe('When DynamicTreeView is mounted', () => {
    it('should show loading state while retrieving empty data and hide it when settled', async () => {
      render();
      expect(renderResult.queryByText(/loading/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(renderResult.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('DynamicTreeView parent level', () => {
    const key = 'orchestrator.cluster.id';
    const tree = [
      {
        key,
        name: 'cluster',
        namePlural: 'clusters',
        type: 'clusterId',
        iconProps: {
          type: 'cluster',
        },
      },
    ];

    it('should make a api call with group based on tree parameters', async () => {
      render({
        tree,
      });

      await waitFor(() => {
        expect(mockedApi).toHaveBeenCalledWith(
          '/internal/kubernetes_security/multi_terms_aggregate',
          {
            query: {
              groupBys: `[{"field":"${key}"},{"field":"orchestrator.cluster.name","missing":""}]`,
              index: '*-logs',
              page: 0,
              perPage: 50,
              query: '{"bool":{"filter":[],"must":[],"must_not":[],"should":[]}}',
            },
            version: '1',
          }
        );
      });
    });

    it('should render the parent level based on api response', async () => {
      render({
        tree,
      });

      await waitFor(() => {
        ['awp-demo-gke-main', 'awp-demo-gke-test'].forEach((cluster) => {
          expect(renderResult.queryByText(cluster)).toBeInTheDocument();
        });
      });
    });

    it('should trigger a callback when tree node is clicked', async () => {
      const callback = jest.fn();
      render({ tree, onSelect: callback });

      await waitFor(() => {
        renderResult.getByRole('button', { name: 'awp-demo-gke-main' }).click();
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('DynamicTreeView children', () => {
    const tree = [
      {
        key: 'orchestrator.cluster.id',
        name: 'clusterId',
        namePlural: 'clusters',
        type: 'clusterId',
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
      await waitFor(() => {
        renderResult.getByRole('button', { name: parent }).click();
      });

      mockedApi.mockResolvedValueOnce(nodeResponseMock);

      await waitFor(() => {
        expect(mockedApi).toHaveBeenCalledWith('/internal/kubernetes_security/aggregate', {
          query: {
            groupBy: 'node',
            index: '*-logs',
            page: 0,
            perPage: 50,
            query: `{"bool":{"filter":[{"term":{"orchestrator.cluster.id":"${parent}"}}],"must":[],"must_not":[],"should":[]}}`,
          },
          version: '1',
        });
      });
    });

    it('should render children when parent is expanded based on api request', async () => {
      render({ tree });

      await waitFor(() => {
        expect(renderResult.getByRole('button', { name: parent })).toBeTruthy();
        mockedApi.mockResolvedValueOnce(nodeResponseMock);
        renderResult.getByRole('button', { name: parent }).click();
      });

      // check if children has loading state
      await waitFor(() => {
        expect(renderResult.queryByText(/loading/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        ['default', 'kube-system', 'production', 'qa', 'staging'].forEach((node) => {
          expect(renderResult.queryByText(node)).toBeInTheDocument();
        });
      });
    });
  });
});
