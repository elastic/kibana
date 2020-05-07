/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render } from 'enzyme';

import { KibanaContext } from '../../../';
import { LicenseContext } from '../../../shared/licensing';
import { mountWithKibanaContext, mockKibanaContext } from '../../../__mocks__';

import { EmptyState, ErrorState, NoUserState } from '../empty_states';
import { EngineTable } from './engine_table';

import { EngineOverview } from './';

describe('EngineOverview', () => {
  describe('non-happy-path states', () => {
    it('isLoading', () => {
      // We use render() instead of mount() here to not trigger lifecycle methods (i.e., useEffect)
      const wrapper = render(
        <KibanaContext.Provider value={{ http: {} }}>
          <LicenseContext.Provider value={{ license: {} }}>
            <EngineOverview />
          </LicenseContext.Provider>
        </KibanaContext.Provider>
      );

      // render() directly renders HTML which means we have to look for selectors instead of for LoadingState directly
      expect(wrapper.find('.euiLoadingContent')).toHaveLength(2);
    });

    it('isEmpty', async () => {
      const wrapper = await mountWithApiMock({
        get: () => ({
          results: [],
          meta: { page: { total_results: 0 } },
        }),
      });

      expect(wrapper.find(EmptyState)).toHaveLength(1);
    });

    it('hasErrorConnecting', async () => {
      const wrapper = await mountWithApiMock({
        get: () => ({ invalidPayload: true }),
      });
      expect(wrapper.find(ErrorState)).toHaveLength(1);
    });

    it('hasNoAccount', async () => {
      const wrapper = await mountWithApiMock({
        get: () => Promise.reject({ body: { message: 'no-as-account' } }),
      });
      expect(wrapper.find(NoUserState)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    const mockedApiResponse = {
      results: [
        {
          name: 'hello-world',
          created_at: 'somedate',
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
    let wrapper;

    beforeAll(async () => {
      wrapper = await mountWithApiMock({ get: mockApi });
    });

    it('renders', () => {
      expect(wrapper.find(EngineTable)).toHaveLength(1);
    });

    it('calls the engines API', () => {
      expect(mockApi).toHaveBeenNthCalledWith(1, '/api/app_search/engines', {
        query: {
          type: 'indexed',
          pageIndex: 1,
        },
      });
    });

    describe('pagination', () => {
      const getTablePagination = () =>
        wrapper
          .find(EngineTable)
          .first()
          .prop('pagination');

      it('passes down page data from the API', () => {
        const pagination = getTablePagination();

        expect(pagination.totalEngines).toEqual(100);
        expect(pagination.pageIndex).toEqual(0);
      });

      it('re-polls the API on page change', async () => {
        await act(async () => getTablePagination().onPaginate(5));
        wrapper.update();

        expect(mockApi).toHaveBeenLastCalledWith('/api/app_search/engines', {
          query: {
            type: 'indexed',
            pageIndex: 5,
          },
        });
        expect(getTablePagination().pageIndex).toEqual(4);
      });
    });

    describe('when on a platinum license', () => {
      beforeAll(async () => {
        mockApi.mockClear();
        wrapper = await mountWithApiMock({
          license: { type: 'platinum', isActive: true },
          get: mockApi,
        });
      });

      it('renders a 2nd meta engines table', () => {
        expect(wrapper.find(EngineTable)).toHaveLength(2);
      });

      it('makes a 2nd call to the engines API with type meta', () => {
        expect(mockApi).toHaveBeenNthCalledWith(2, '/api/app_search/engines', {
          query: {
            type: 'meta',
            pageIndex: 1,
          },
        });
      });
    });
  });

  /**
   * Test helpers
   */

  const mountWithApiMock = async ({ get, license }) => {
    let wrapper;
    const httpMock = { ...mockKibanaContext.http, get };

    // We get a lot of act() warning/errors in the terminal without this.
    // TBH, I don't fully understand why since Enzyme's mount is supposed to
    // have act() baked in - could be because of the wrapping context provider?
    await act(async () => {
      wrapper = mountWithKibanaContext(
        <LicenseContext.Provider value={{ license }}>
          <EngineOverview />
        </LicenseContext.Provider>,
        { http: httpMock }
      );
    });
    wrapper.update(); // This seems to be required for the DOM to actually update

    return wrapper;
  };
});
