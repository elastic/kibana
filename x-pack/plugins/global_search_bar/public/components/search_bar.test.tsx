/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { GlobalSearchBatchedResults, GlobalSearchResult } from '@kbn/global-search-plugin/public';
import { globalSearchPluginMock } from '@kbn/global-search-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { filter, map } from 'rxjs';
import { EventReporter } from '../telemetry';
import { SearchBar } from './search_bar';

jest.mock(
  'react-virtualized-auto-sizer',
  () =>
    ({ children }: any) =>
      children({ height: 600, width: 600 })
);

type Result = { id: string; type: string } | string;

const createResult = (result: Result): GlobalSearchResult => {
  const id = typeof result === 'string' ? result : result.id;
  const type = typeof result === 'string' ? 'application' : result.type;
  const meta = type === 'application' ? { categoryLabel: 'Kibana' } : { categoryLabel: null };

  return {
    id,
    type,
    title: id,
    url: `/app/test/${id}`,
    score: 42,
    meta,
  };
};

const createBatch = (...results: Result[]): GlobalSearchBatchedResults => ({
  results: results.map(createResult),
});
jest.useFakeTimers({ legacyFakeTimers: true });

describe('SearchBar', () => {
  const usageCollection = usageCollectionPluginMock.createSetupContract();
  const core = coreMock.createStart();

  const basePathUrl = '/plugins/globalSearchBar/assets/';
  const eventReporter = new EventReporter({ analytics: core.analytics, usageCollection });
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;

  beforeEach(() => {
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();
  });

  const update = () => {
    act(() => {
      jest.runAllTimers();
    });
  };

  const focusAndUpdate = async () => {
    await act(async () => {
      (await screen.findByTestId('nav-search-input')).focus();
      jest.runAllTimers();
    });
  };

  const simulateTypeChar = (text: string) => {
    fireEvent.input(screen.getByTestId('nav-search-input'), { target: { value: text } });
    act(() => {
      jest.runAllTimers();
    });
  };

  const assertSearchResults = async (list: string[]) => {
    for (let i = 0; i < list.length; i++) {
      expect(await screen.findByTitle(list[i])).toBeInTheDocument();
    }

    expect(await screen.findAllByTestId('nav-search-option')).toHaveLength(list.length);
  };

  describe('chromeStyle: classic', () => {
    const chromeStyle$ = of<ChromeStyle>('classic');

    it('correctly filters and sorts results', async () => {
      searchService.find
        .mockReturnValueOnce(
          of(
            createBatch('Discover', 'Canvas'),
            createBatch({ id: 'Visualize', type: 'test' }, 'Graph')
          )
        )
        .mockReturnValueOnce(of(createBatch('Discover', { id: 'My Dashboard', type: 'test' })));

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={searchService}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      expect(searchService.find).toHaveBeenCalledTimes(0);

      await focusAndUpdate();

      expect(searchService.find).toHaveBeenCalledTimes(1);
      expect(searchService.find).toHaveBeenCalledWith({}, {});
      await assertSearchResults(['Canvas • Kibana', 'Discover • Kibana', 'Graph • Kibana']);

      simulateTypeChar('d');

      await assertSearchResults(['Discover • Kibana', 'My Dashboard • Test']);
      expect(searchService.find).toHaveBeenCalledTimes(2);
      expect(searchService.find).toHaveBeenLastCalledWith({ term: 'd' }, {});
    });

    it('supports keyboard shortcuts', async () => {
      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={searchService}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );
      act(() => {
        fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
      });

      const inputElement = await screen.findByTestId('nav-search-input');

      expect(document.activeElement).toEqual(inputElement);
    });

    it('only display results from the last search', async () => {
      const firstSearchTrigger = new BehaviorSubject<boolean>(false);
      const firstSearch = firstSearchTrigger.pipe(
        filter((event) => event),
        map(() => {
          return createBatch('Discover', 'Canvas');
        })
      );
      const secondSearch = of(createBatch('Visualize', 'Map'));

      searchService.find.mockReturnValueOnce(firstSearch).mockReturnValueOnce(secondSearch);

      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={searchService}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      await focusAndUpdate();

      expect(searchService.find).toHaveBeenCalledTimes(1);

      simulateTypeChar('d');
      await assertSearchResults(['Visualize • Kibana', 'Map • Kibana']);

      firstSearchTrigger.next(true);

      update();

      await assertSearchResults(['Visualize • Kibana', 'Map • Kibana']);
    });
  });

  describe('chromeStyle: project', () => {
    const chromeStyle$ = of<ChromeStyle>('project');

    it('supports keyboard shortcuts', async () => {
      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={searchService}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      act(() => {
        fireEvent.keyDown(window, { key: '/', ctrlKey: true, metaKey: true });
      });

      expect(await screen.findByTestId('nav-search-input')).toEqual(document.activeElement);

      fireEvent.click(await screen.findByTestId('nav-search-conceal'));
      expect(screen.queryAllByTestId('nav-search-input')).toHaveLength(0);
    });

    it('supports show/hide', async () => {
      render(
        <IntlProvider locale="en">
          <SearchBar
            globalSearch={searchService}
            navigateToUrl={applications.navigateToUrl}
            basePathUrl={basePathUrl}
            chromeStyle$={chromeStyle$}
            reportEvent={eventReporter}
          />
        </IntlProvider>
      );

      fireEvent.click(await screen.findByTestId('nav-search-reveal'));
      expect(await screen.findByTestId('nav-search-input')).toBeVisible();

      fireEvent.click(await screen.findByTestId('nav-search-conceal'));
      expect(screen.queryAllByTestId('nav-search-input')).toHaveLength(0);
    });
  });
});
