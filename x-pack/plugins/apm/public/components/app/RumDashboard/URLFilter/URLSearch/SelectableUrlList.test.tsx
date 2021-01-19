/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { createMemoryHistory } from 'history';
import * as fetcherHook from '../../../../../hooks/use_fetcher';
import { SelectableUrlList } from './SelectableUrlList';
import { render } from '../../utils/test_helper';

describe('SelectableUrlList', () => {
  it('it uses search term value from url', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {},
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    const customHistory = createMemoryHistory({
      initialEntries: ['/?searchTerm=blog'],
    });

    const { getByDisplayValue } = render(
      <SelectableUrlList
        initialValue={'blog'}
        loading={false}
        data={{ items: [], total: 0 }}
        onChange={jest.fn()}
        searchValue={'blog'}
        onClose={jest.fn()}
        onInputChange={jest.fn()}
        onTermChange={jest.fn()}
        popoverIsOpen={false}
        setPopoverIsOpen={jest.fn()}
      />,
      { customHistory }
    );
    expect(getByDisplayValue('blog')).toBeInTheDocument();
  });
});
