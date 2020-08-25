/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow, ReactWrapper } from 'enzyme';

import { mountWithAsyncContext, mockKibanaContext } from '../../../__mocks__';

import { LoadingState, EmptyState } from './components';
import { EngineTable } from './engine_table';

import { EngineOverview } from './';

describe('EngineOverview', () => {
  const mockHttp = mockKibanaContext.http;

  describe('non-happy-path states', () => {
    it('isLoading', () => {
      const wrapper = shallow(<EngineOverview />);

      expect(wrapper.find(LoadingState)).toHaveLength(1);
    });

    it('isEmpty', async () => {
      const wrapper = await mountWithAsyncContext(<EngineOverview />, {
        http: {
          ...mockHttp,
          get: () => ({
            results: [],
            meta: { page: { total_results: 0 } },
          }),
        },
      });

      expect(wrapper.find(EmptyState)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    const mockedApiResponse = {
      results: [
        {
          name: 'hello-world',
          created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
          document_count: 50,
          field_count: 10,
        },
      ],
      meta: {
        page: {
          current: 1,
          total_pages: 10,
          total_results: 100,
          size: 10,
        },
      },
    };
    const mockApi = jest.fn(() => mockedApiResponse);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders and calls the engines API', async () => {
      const wrapper = await mountWithAsyncContext(<EngineOverview />, {
        http: { ...mockHttp, get: mockApi },
      });

      expect(wrapper.find(EngineTable)).toHaveLength(1);
      expect(mockApi).toHaveBeenNthCalledWith(1, '/api/app_search/engines', {
        query: {
          type: 'indexed',
          pageIndex: 1,
        },
      });
    });

    describe('when on a platinum license', () => {
      it('renders a 2nd meta engines table & makes a 2nd meta engines API call', async () => {
        const wrapper = await mountWithAsyncContext(<EngineOverview />, {
          http: { ...mockHttp, get: mockApi },
          license: { type: 'platinum', isActive: true },
        });

        expect(wrapper.find(EngineTable)).toHaveLength(2);
        expect(mockApi).toHaveBeenNthCalledWith(2, '/api/app_search/engines', {
          query: {
            type: 'meta',
            pageIndex: 1,
          },
        });
      });
    });

    describe('pagination', () => {
      const getTablePagination = (wrapper: ReactWrapper) =>
        wrapper.find(EngineTable).prop('pagination');

      it('passes down page data from the API', async () => {
        const wrapper = await mountWithAsyncContext(<EngineOverview />, {
          http: { ...mockHttp, get: mockApi },
        });
        const pagination = getTablePagination(wrapper);

        expect(pagination.totalEngines).toEqual(100);
        expect(pagination.pageIndex).toEqual(0);
      });

      it('re-polls the API on page change', async () => {
        const wrapper = await mountWithAsyncContext(<EngineOverview />, {
          http: { ...mockHttp, get: mockApi },
        });
        await act(async () => getTablePagination(wrapper).onPaginate(5));
        wrapper.update();

        expect(mockApi).toHaveBeenLastCalledWith('/api/app_search/engines', {
          query: {
            type: 'indexed',
            pageIndex: 5,
          },
        });
        expect(getTablePagination(wrapper).pageIndex).toEqual(4);
      });
    });
  });
});
