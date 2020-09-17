/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { wait } from '@testing-library/react';
import { of } from 'rxjs';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import {
  GlobalSearchBatchedResults,
  GlobalSearchPluginStart,
  GlobalSearchResult,
} from '../../../global_search/public';
import { globalSearchPluginMock } from '../../../global_search/public/mocks';
import { SearchBar } from '../components/search_bar';

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

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

const getSelectableProps: any = (component: any) => component.find('EuiSelectable').props();
const getSearchProps: any = (component: any) => component.find('EuiFieldSearch').props();

describe('SearchBar', () => {
  let searchService: GlobalSearchPluginStart;
  let findSpy: jest.SpyInstance;

  beforeEach(() => {
    searchService = globalSearchPluginMock.createStartContract();
    findSpy = jest.spyOn(searchService, 'find');
    jest.useFakeTimers();
  });

  it('correctly filters and sorts results', async () => {
    const navigate = jest.fn();
    findSpy
      .mockReturnValueOnce(
        of(
          createBatch('Discover', 'Canvas'),
          createBatch({ id: 'Visualize', type: 'test' }, 'Graph')
        )
      )
      .mockReturnValueOnce(of(createBatch('Discover', { id: 'My Dashboard', type: 'test' })));

    const component = mountWithIntl(
      <SearchBar globalSearch={searchService.find} navigateToUrl={navigate} />
    );

    expect(findSpy).toHaveBeenCalledTimes(0);
    component.find('input[data-test-subj="header-search"]').simulate('focus');
    jest.runAllTimers();
    component.update();
    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(findSpy).toHaveBeenCalledWith('', {});
    expect(getSelectableProps(component).options).toMatchSnapshot();
    await wait(() => getSearchProps(component).onKeyUpCapture({ currentTarget: { value: 'd' } }));
    jest.runAllTimers();
    component.update();
    expect(getSelectableProps(component).options).toMatchSnapshot();
    expect(findSpy).toHaveBeenCalledTimes(2);
    expect(findSpy).toHaveBeenCalledWith('d', {});
  });

  it('supports keyboard shortcuts', () => {
    mountWithIntl(<SearchBar globalSearch={searchService.find} navigateToUrl={jest.fn()} />);

    const searchEvent = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      metaKey: true,
    } as any);
    window.dispatchEvent(searchEvent);

    expect(document.activeElement).toMatchSnapshot();
  });
});
