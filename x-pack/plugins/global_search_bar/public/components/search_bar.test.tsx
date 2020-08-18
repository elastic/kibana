/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SearchBar } from '../components/search_bar';
import { globalSearchPluginMock } from '../../../global_search/public/mocks';
import { GlobalSearchPluginStart } from '../../../global_search/public';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

describe('SearchBar', () => {
  let searchService: GlobalSearchPluginStart;
  // let findSpy: jest.SpyInstance;

  beforeEach(() => {
    searchService = globalSearchPluginMock.createStartContract();
    // findSpy = jest.spyOn(globalSearchPluginMock, 'createStartContract');
  });

  it('basically works', async () => {
    const component = mountWithIntl(
      <SearchBar globalSearch={searchService.find} navigateToUrl={jest.fn()} />
    );
    expect(component).toMatchSnapshot(); // popover closed
    // expect(findSpy).toHaveBeenCalledTimes(1);
    // expect(findSpy).toHaveBeenCalledWith('');

    // component.find('input[data-test-subj="header-search"]').simulate('keydown', { key: 'd' });
    // expect(component).toMatchSnapshot(); // popover open
    // expect(findSpy).toHaveBeenCalledTimes(1);
    // expect(findSpy).toHaveBeenCalledWith('d');

    // click on result
    // navigate to new page
    // click into into search bar, results rendered like new
  });
  it('supports keyboard shortcuts', () => {
    // cmd/ctrl+s focuses search bar, popover opens, results rendered
  });
});
