/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContext } from '../../../';
import { LicenseContext } from '../../../shared/licensing';
import { mountWithContext, mockKibanaContext } from '../../../__mocks__';

import { EmptyState, ErrorState } from '../empty_states';
import { EngineTable, IEngineTablePagination } from './engine_table';

import { EngineOverview } from './';

describe('EngineOverview', () => {
  describe('non-happy-path states', () => {
    it('isLoading', () => {
      // We use render() instead of mount() here to not trigger lifecycle methods (i.e., useEffect)
      // TODO: Consider pulling this out to a renderWithContext mock/helper
      const wrapper: Cheerio = render(
        <I18nProvider>
          <KibanaContext.Provider value={{ http: {} }}>
            <LicenseContext.Provider value={{ license: {} }}>
              <EngineOverview />
            </LicenseContext.Provider>
          </KibanaContext.Provider>
        </I18nProvider>
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
    let wrapper: ReactWrapper;

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
      const getTablePagination: () => IEngineTablePagination = () =>
        wrapper.find(EngineTable).first().prop('pagination');

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

  const mountWithApiMock = async ({ get, license }: { get(): any; license?: object }) => {
    let wrapper: ReactWrapper | undefined;
    const httpMock = { ...mockKibanaContext.http, get };

    // We get a lot of act() warning/errors in the terminal without this.
    // TBH, I don't fully understand why since Enzyme's mount is supposed to
    // have act() baked in - could be because of the wrapping context provider?
    await act(async () => {
      wrapper = mountWithContext(<EngineOverview />, { http: httpMock, license });
    });
    if (wrapper) {
      wrapper.update(); // This seems to be required for the DOM to actually update

      return wrapper;
    } else {
      throw new Error('Could not mount wrapper');
    }
  };
});
