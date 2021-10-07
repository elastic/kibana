/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  screen,
} from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';
import { createMemoryHistory } from 'history';
import * as fetcherHook from '../../../../../hooks/use_fetcher';
import { SelectableUrlList } from './SelectableUrlList';
import { render } from '../../utils/test_helper';
import { I18LABELS } from '../../translations';

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
      <IntlProvider locale="en">
        <SelectableUrlList
          initialValue={'blog'}
          loading={false}
          data={{ items: [], total: 0 }}
          onChange={jest.fn()}
          searchValue={'blog'}
          onInputChange={jest.fn()}
          onTermChange={jest.fn()}
          popoverIsOpen={Boolean(isPopoverOpen)}
          setPopoverIsOpen={setIsPopoverOpen}
          onApply={jest.fn()}
        />
      </IntlProvider>
    );
  }

  it('it uses search term value from url', () => {
    const { getByDisplayValue } = render(
      <IntlProvider locale="en">
        <SelectableUrlList
          initialValue={'blog'}
          loading={false}
          data={{ items: [], total: 0 }}
          onChange={jest.fn()}
          searchValue={'blog'}
          onInputChange={jest.fn()}
          onTermChange={jest.fn()}
          popoverIsOpen={false}
          setPopoverIsOpen={jest.fn()}
          onApply={jest.fn()}
        />
      </IntlProvider>,
      { customHistory }
    );
    expect(getByDisplayValue('blog')).toBeInTheDocument();
  });

  it('maintains focus on search input field', () => {
    const { getByLabelText } = render(
      <IntlProvider locale="en">
        <SelectableUrlList
          initialValue={'blog'}
          loading={false}
          data={{ items: [], total: 0 }}
          onChange={jest.fn()}
          searchValue={'blog'}
          onInputChange={jest.fn()}
          onTermChange={jest.fn()}
          popoverIsOpen={false}
          setPopoverIsOpen={jest.fn()}
          onApply={jest.fn()}
        />
      </IntlProvider>,
      { customHistory }
    );

    const input = getByLabelText(I18LABELS.filterByUrl);
    fireEvent.click(input);

    expect(document.activeElement).toBe(input);
  });

  it('hides popover on escape', async () => {
    const { getByText, getByLabelText, queryByText } = render(
      <WrappedComponent />,
      { customHistory }
    );

    const input = getByLabelText(I18LABELS.filterByUrl);
    fireEvent.click(input);

    // wait for title of popover to be present
    await waitFor(() => {
      expect(getByText(I18LABELS.getSearchResultsLabel(0))).toBeInTheDocument();
      screen.debug();
    });

    // escape key
    fireEvent.keyDown(input, {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      charCode: 27,
    });

    // wait for title of popover to be removed
    await waitForElementToBeRemoved(() =>
      queryByText(I18LABELS.getSearchResultsLabel(0))
    );
  });
});
