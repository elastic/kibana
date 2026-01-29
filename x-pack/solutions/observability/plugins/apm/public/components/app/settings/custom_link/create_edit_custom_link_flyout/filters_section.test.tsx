/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { AddFilterButton, FiltersSection } from './filters_section';
import { isEmpty } from 'lodash';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiThemeProvider>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </EuiThemeProvider>
  );
}

describe('FiltersSections', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    const { getByText } = render(<FiltersSection filters={[]} setFilters={() => {}} />, {
      wrapper: Wrapper,
    });

    expect(getByText('Filters')).toBeInTheDocument();
  });

  it('clears SuggestionsSelect value when EuiSelect value changes', async () => {
    jest.mock('../../../../shared/suggestions_select', () => ({
      SuggestionsSelect: (props: {
        defaultValue: string | undefined;
        onChange: (arg0: string | undefined) => void;
      }) => (
        <input
          data-testid="comboBoxSearchInput"
          value={props.defaultValue}
          onChange={(e) => props.onChange(e.target.value)}
        />
      ),
    }));

    const initialFilters: Filter[] = [{ key: 'service.name', value: 'foo', id: '123' }];
    const setFilters = jest.fn();

    const { getByLabelText, getByTestId, rerender } = render(
      <FiltersSection filters={initialFilters} setFilters={setFilters} />,
      { wrapper: Wrapper }
    );

    const select = getByLabelText('Choose a field to filter by');
    const suggestionsSelect = getByTestId('comboBoxSearchInput') as HTMLSelectElement;
    expect(suggestionsSelect.value).toBe('foo');

    await act(async () => {
      fireEvent.change(select, { target: { value: 'transaction.type' } });
    });

    expect(setFilters).toHaveBeenCalledWith([{ key: 'transaction.type', value: '', id: '123' }]);

    await act(async () => {
      rerender(
        <FiltersSection
          filters={[{ key: 'transaction.type', value: '', id: '123' }]}
          setFilters={setFilters}
        />
      );
    });

    const suggestionsSelect2 = getByTestId('comboBoxSearchInput') as HTMLSelectElement;
    expect(suggestionsSelect2.value).toBe('');
  });

  it('empties the key and the value AND keeps the selects visible, when I have only 1 filter and I delete the filter.', async () => {
    const initialFilters: Filter[] = [{ key: 'service.name', value: 'foo' }];
    const setFilters = jest.fn();
    const { getAllByTestId } = render(
      <FiltersSection filters={initialFilters} setFilters={setFilters} />,
      { wrapper: Wrapper }
    );

    const removeButtons = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons).toHaveLength(1);

    const suggestionsSelect = getAllByTestId('comboBoxSearchInput');
    expect(suggestionsSelect).toHaveLength(1);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    expect(removeButtons).toHaveLength(1);
    expect(suggestionsSelect).toHaveLength(1);
  });

  it('has the Delete disabled, when I have 1 filter and the selects have no values', async () => {
    const initialFilters: Filter[] = [{ key: '', value: '' }];
    const setFilters = jest.fn();
    const { getAllByTestId } = render(
      <FiltersSection filters={initialFilters} setFilters={setFilters} />,
      { wrapper: Wrapper }
    );

    const removeButtons = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]).toBeDisabled();
  });

  it('when many filters, it deletes the proper filter', async () => {
    const initialFilters: Filter[] = [
      { key: 'service.name', value: 'foo', id: '123' },
      { key: 'transaction.type', value: 'bar', id: '456' },
    ];
    const setFilters = jest.fn();
    const { getAllByTestId, rerender } = render(
      <FiltersSection filters={initialFilters} setFilters={setFilters} />,
      { wrapper: Wrapper }
    );

    const removeButtons = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons).toHaveLength(2);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    expect(setFilters).toHaveBeenCalledWith([{ key: 'transaction.type', value: 'bar', id: '456' }]);

    await act(async () => {
      rerender(
        <FiltersSection
          filters={[{ key: 'transaction.type', value: 'bar', id: '456' }]}
          setFilters={setFilters}
        />
      );
    });

    const removeButtons2 = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons2).toHaveLength(1);
  });
});

const FILTER_SELECT_OPTIONS = [
  { value: 'DEFAULT', text: 'Select Field ...' },
  { value: 'service.name', text: 'Service Name' },
  { value: 'transaction.type', text: 'Transaction Type' },
  { value: 'transaction.name', text: 'Transaction Name' },
  { value: 'service.environment', text: 'Environment' },
];

function getIsDisabled(filters: Filter[]) {
  return (
    filters.length === FILTER_SELECT_OPTIONS.length - 1 ||
    filters.some((filter) => isEmpty(filter.key) || isEmpty(filter.value))
  );
}

describe('AddFilterButton isDisabled logic', () => {
  it('disables AddFilterButton when all filter slots are used', () => {
    const filters: Filter[] = [
      { key: 'service.name', value: 'Service Name' },
      { key: 'transaction.type', value: 'Transaction Type' },
      { key: 'transaction.name', value: 'Transaction Name' },
      { key: 'service.environment', value: 'Environment' },
    ];
    expect(getIsDisabled(filters)).toBe(true);

    const clickHandler = jest.fn();
    const { getByTestId } = render(
      <AddFilterButton isDisabled={getIsDisabled(filters)} onClick={clickHandler} />,
      {
        wrapper: Wrapper,
      }
    );
    const addButton = getByTestId('apmCustomLinkAddFilterButtonAddAnotherFilterButton');
    expect(addButton).toBeDisabled();
  });

  it('should disable if any filter has empty key', () => {
    const filters: Filter[] = [
      { key: '', value: 'Transaction Name' },
      { key: 'service.environment', value: 'Service Environment' },
    ];
    expect(getIsDisabled(filters)).toBe(true);
  });

  it('should disable if any filter has empty value', () => {
    const filters: Filter[] = [
      { key: 'service.name', value: '' },
      { key: 'service.environment', value: 'Service Environment' },
    ];
    expect(getIsDisabled(filters)).toBe(true);
  });

  it('should enable if all filters are valid and there are unused filter slots', () => {
    const filters: Filter[] = [{ key: 'service.name', value: 'Service Name' }];
    expect(getIsDisabled(filters)).toBe(false);
  });
});
