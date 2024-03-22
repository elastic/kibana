/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useGetAllIndexPatternsFromSources } from './use_get_all_index_patterns_from_sources';
import { useKibana } from '../../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');

const mapDataViewIdToPatterns: { [key: string]: string } = {
  'alerts-view': 'alerts*,alerts1*,alerts2*',
  'logs-view': 'logs*,logs1*,logs2*',
};

describe('useGetAllIndexPatternsFromSources hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const data = dataPluginMock.createStartContract();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
        data: {
          ...data,
          dataViews: {
            get: async (dataViewId: string) => {
              const dataViewMock = {
                id: dataViewId,
                getIndexPattern: () => mapDataViewIdToPatterns[dataViewId],
              };
              return Promise.resolve({
                toSpec: () => dataViewMock,
                ...dataViewMock,
              });
            },
          },
        },
      },
    });
  });

  it('should get index patterns from index patterns data sources', async () => {
    const sources = {
      indexPatterns: ['index1', 'index2*'],
      dataViewIds: [],
    };
    const { waitForNextUpdate, result } = renderHook(
      () => useGetAllIndexPatternsFromSources(sources),
      {
        wrapper: TestProviders,
      }
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.indexPatterns).toEqual(['index1', 'index2*']);
  });

  it('should get index patterns from data view sources', async () => {
    const sources = {
      indexPatterns: [],
      dataViewIds: ['alerts-view', 'logs-view'],
    };
    const { waitForNextUpdate, result } = renderHook(
      () => useGetAllIndexPatternsFromSources(sources),
      {
        wrapper: TestProviders,
      }
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.indexPatterns).toEqual([
      'alerts*',
      'alerts1*',
      'alerts2*',
      'logs*',
      'logs1*',
      'logs2*',
    ]);
  });

  it('should get index patterns from mixed data sources', async () => {
    const sources = {
      indexPatterns: ['logs*', 'endpoint*', 'alerts2*'],
      dataViewIds: ['alerts-view', 'logs-view'],
    };
    const { waitForNextUpdate, result } = renderHook(
      () => useGetAllIndexPatternsFromSources(sources),
      {
        wrapper: TestProviders,
      }
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.indexPatterns).toEqual([
      'logs*',
      'endpoint*',
      'alerts2*',
      'alerts*',
      'alerts1*',
      'logs1*',
      'logs2*',
    ]);
  });
});
