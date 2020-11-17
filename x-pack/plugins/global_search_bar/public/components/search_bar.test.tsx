/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import { ReactWrapper } from 'enzyme';
import { of, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { mountWithIntl } from '@kbn/test/jest';
import { applicationServiceMock } from '../../../../../src/core/public/mocks';
import { GlobalSearchBatchedResults, GlobalSearchResult } from '../../../global_search/public';
import { globalSearchPluginMock } from '../../../global_search/public/mocks';
import { SearchBar } from './search_bar';

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

const getSelectableProps: any = (component: any) => component.find('EuiSelectable').props();
const getSearchProps: any = (component: any) => component.find('EuiFieldSearch').props();

describe('SearchBar', () => {
  let searchService: ReturnType<typeof globalSearchPluginMock.createStartContract>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  const basePathUrl = '/plugins/globalSearchBar/assets/';
  const darkMode = false;

  let component: ReactWrapper<any>;

  beforeEach(() => {
    applications = applicationServiceMock.createStartContract();
    searchService = globalSearchPluginMock.createStartContract();
    jest.useFakeTimers();
  });

  const triggerFocus = () => {
    component.find('input[data-test-subj="header-search"]').simulate('focus');
  };

  const update = () => {
    act(() => {
      jest.runAllTimers();
    });
    component.update();
  };

  const simulateTypeChar = async (text: string) => {
    await waitFor(() =>
      getSearchProps(component).onKeyUpCapture({ currentTarget: { value: text } })
    );
  };

  const getDisplayedOptionsTitle = () => {
    return getSelectableProps(component).options.map((option: any) => option.title);
  };

  it('correctly filters and sorts results', async () => {
    searchService.find
      .mockReturnValueOnce(
        of(
          createBatch('Discover', 'Canvas'),
          createBatch({ id: 'Visualize', type: 'test' }, 'Graph')
        )
      )
      .mockReturnValueOnce(of(createBatch('Discover', { id: 'My Dashboard', type: 'test' })));

    component = mountWithIntl(
      <SearchBar
        globalSearch={searchService.find}
        navigateToUrl={applications.navigateToUrl}
        basePathUrl={basePathUrl}
        darkMode={darkMode}
        trackUiMetric={jest.fn()}
      />
    );

    expect(searchService.find).toHaveBeenCalledTimes(0);

    triggerFocus();
    update();

    expect(searchService.find).toHaveBeenCalledTimes(1);
    expect(searchService.find).toHaveBeenCalledWith({}, {});
    expect(getDisplayedOptionsTitle()).toMatchSnapshot();

    await simulateTypeChar('d');
    update();

    expect(getDisplayedOptionsTitle()).toMatchSnapshot();
    expect(searchService.find).toHaveBeenCalledTimes(2);
    expect(searchService.find).toHaveBeenCalledWith({ term: 'd' }, {});
  });

  it('supports keyboard shortcuts', () => {
    mountWithIntl(
      <SearchBar
        globalSearch={searchService.find}
        navigateToUrl={applications.navigateToUrl}
        basePathUrl={basePathUrl}
        darkMode={darkMode}
        trackUiMetric={jest.fn()}
      />
    );

    const searchEvent = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      metaKey: true,
    } as any);
    window.dispatchEvent(searchEvent);

    expect(document.activeElement).toMatchSnapshot();
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

    component = mountWithIntl(
      <SearchBar
        globalSearch={searchService.find}
        navigateToUrl={applications.navigateToUrl}
        basePathUrl={basePathUrl}
        darkMode={darkMode}
        trackUiMetric={jest.fn()}
      />
    );

    triggerFocus();
    update();

    expect(searchService.find).toHaveBeenCalledTimes(1);

    await simulateTypeChar('d');
    update();

    expect(getDisplayedOptionsTitle()).toMatchSnapshot();

    firstSearchTrigger.next(true);

    update();

    expect(getDisplayedOptionsTitle()).toMatchSnapshot();
  });
});
