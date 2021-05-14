/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import {
  FilterPopoverProps,
  FilterPopover,
  removeFilterForItemLabel,
  filterByItemLabel,
} from './filter_popover';
import { render } from '../../../lib/helper/rtl_helpers';

describe('FilterPopover component', () => {
  let props: FilterPopoverProps;

  beforeEach(() => {
    props = {
      fieldName: 'test-fieldName',
      id: 'test',
      loading: false,
      items: ['first', 'second', 'third', 'fourth'],
      onFilterFieldChange: jest.fn(),
      selectedItems: ['first', 'third'],
      title: 'test-title',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('expands on button click', () => {
    const { getByRole, getByLabelText, getByText, queryByLabelText, queryByText } = render(
      <FilterPopover {...props} />
    );

    const screenReaderOnlyText = 'You are in a dialog. To close this dialog, hit escape.';

    expect(queryByText(screenReaderOnlyText)).toBeNull();
    expect(queryByLabelText('Filter by bar fourth.')).toBeNull();

    fireEvent.click(getByRole('button'));

    expect(getByText(screenReaderOnlyText));
    expect(getByLabelText('Filter by test-title fourth.'));
  });

  it('does not show item list when loading, and displays placeholder', async () => {
    props.loading = true;
    const { getByRole, queryByText, getByLabelText } = render(<FilterPopover {...props} />);

    fireEvent.click(getByRole('button'));

    await waitFor(() => {
      const search = getByLabelText('Search for test-title');
      expect(search).toHaveAttribute('placeholder', 'Loading...');
    });

    expect(queryByText('Filter by test-title second.')).toBeNull();
  });

  it.each([
    [[], ['third'], ['third']],
    [['first', 'third'], ['first'], ['third']],
    [['fourth'], ['first', 'second'], ['first', 'second', 'fourth']],
  ])(
    'returns selected items on popover close',
    async (selectedPropsItems, expectedSelections, itemsToClick) => {
      if (itemsToClick.length < 1) {
        throw new Error('This test assumes at least one item will be clicked');
      }
      props.selectedItems = selectedPropsItems;

      const { getByLabelText, queryByLabelText } = render(<FilterPopover {...props} />);

      const uptimeFilterButton = getByLabelText(`expands filter group for ${props.title} filter`);

      fireEvent.click(uptimeFilterButton);

      selectedPropsItems.forEach((item) => {
        expect(getByLabelText(removeFilterForItemLabel(item, props.title)));
      });

      itemsToClick.forEach((item) => {
        let optionButton: HTMLElement;
        if (selectedPropsItems.some((i) => i === item)) {
          optionButton = getByLabelText(removeFilterForItemLabel(item, props.title));
        } else {
          optionButton = getByLabelText(filterByItemLabel(item, props.title));
        }
        fireEvent.click(optionButton);
      });

      fireEvent.click(uptimeFilterButton);

      await waitForElementToBeRemoved(() =>
        queryByLabelText(`by ${props.title} ${itemsToClick[0]}`, { exact: false })
      );

      expect(props.onFilterFieldChange).toHaveBeenCalledTimes(1);
      expect(props.onFilterFieldChange).toHaveBeenCalledWith(props.fieldName, expectedSelections);
    }
  );
});
