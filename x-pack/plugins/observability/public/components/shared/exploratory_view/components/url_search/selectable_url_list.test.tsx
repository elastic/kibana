/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as fetcherHook from '../../../../../hooks/use_fetcher';
import { SelectableUrlList } from './selectable_url_list';
import { I18LABELS } from './translations';
import { render } from '../../rtl_helpers';

describe('SelectableUrlList', () => {
  jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
    data: {},
    status: fetcherHook.FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  });

  const customHistory = createMemoryHistory({
    initialEntries: ['/?searchTerm=blog'],
  });

  function WrappedComponent() {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    return (
      <SelectableUrlList
        initialValue={'blog'}
        loading={false}
        data={{ items: [], total: 0 }}
        onSelectionChange={jest.fn()}
        searchValue={'blog'}
        onInputChange={jest.fn()}
        popoverIsOpen={Boolean(isPopoverOpen)}
        setPopoverIsOpen={setIsPopoverOpen}
        onSelectionApply={jest.fn()}
        hasChanged={() => true}
      />
    );
  }

  it('it uses search term value from url', () => {
    const { getByDisplayValue } = render(
      <SelectableUrlList
        initialValue={'blog'}
        loading={false}
        data={{ items: [], total: 0 }}
        onSelectionChange={jest.fn()}
        searchValue={'blog'}
        onInputChange={jest.fn()}
        popoverIsOpen={false}
        setPopoverIsOpen={jest.fn()}
        onSelectionApply={jest.fn()}
        hasChanged={() => true}
      />,
      { history: customHistory }
    );
    expect(getByDisplayValue('blog')).toBeInTheDocument();
  });

  it('maintains focus on search input field', () => {
    const { getByLabelText } = render(
      <SelectableUrlList
        initialValue={'blog'}
        loading={false}
        data={{ items: [], total: 0 }}
        onSelectionChange={jest.fn()}
        searchValue={'blog'}
        onInputChange={jest.fn()}
        popoverIsOpen={false}
        setPopoverIsOpen={jest.fn()}
        onSelectionApply={jest.fn()}
        hasChanged={() => true}
      />,
      { history: customHistory }
    );

    const input = getByLabelText(I18LABELS.filterByUrl);
    fireEvent.click(input);

    expect(document.activeElement).toBe(input);
  });

  it('hides popover on escape', async () => {
    const { getByText, getByLabelText, queryByText } = render(<WrappedComponent />, {
      history: customHistory,
    });

    const input = getByLabelText(I18LABELS.filterByUrl);
    fireEvent.click(input);

    // wait for title of popover to be present
    await waitFor(() => {
      expect(getByText(I18LABELS.getSearchResultsLabel(0))).toBeInTheDocument();
    });

    // escape key
    fireEvent.keyDown(input, {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      charCode: 27,
    });

    // wait for title of popover to be removed
    await waitForElementToBeRemoved(() => queryByText(I18LABELS.getSearchResultsLabel(0)));
  });
});
