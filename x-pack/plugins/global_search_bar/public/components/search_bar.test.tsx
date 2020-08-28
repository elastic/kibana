/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
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

  return {
    id,
    type,
    title: id,
    url: `/app/test/${id}`,
    score: 42,
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
  });

  it('correctly filters and sorts results', async () => {
    const navigate = jest.fn();
    let component: ReactWrapper;
    findSpy
      .mockReturnValueOnce(
        of(
          createBatch('Discover', 'Canvas'),
          createBatch({ id: 'Visualize', type: 'test' }, 'Graph')
        )
      )
      .mockReturnValueOnce(of(createBatch('Discover', { id: 'My Dashboard', type: 'test' })));

    act(() => {
      component = mountWithIntl(
        <SearchBar globalSearch={searchService.find} navigateToUrl={navigate} />
      );
    });
    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(findSpy).toHaveBeenCalledWith('', {});
    act(() => {
      component.update();
      expect(getSelectableProps(component).options).toMatchSnapshot(); // default list
      component.find('input[data-test-subj="header-search"]').simulate('focus');
    });
    expect(findSpy).toHaveBeenCalledTimes(1);

    act(() => {
      component.update();
      getSearchProps(component).onSearch('d');
    });
    act(() => {
      component.update();
      expect(getSelectableProps(component).options).toMatchSnapshot(); // list filtered
    });
    expect(findSpy).toHaveBeenCalledTimes(2);
  });
  it('supports keyboard shortcuts', () => {
    // cmd/ctrl+s focuses search bar, popover opens, results rendered
  });
});
