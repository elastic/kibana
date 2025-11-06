/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { FiltersSection } from './filters_section';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiThemeProvider>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </EuiThemeProvider>
  );
}

describe('FiltersSections', () => {
  it('renders the component', () => {
    const { getByText } = render(<FiltersSection filters={[]} onChangeFilters={() => {}} />, {
      wrapper: Wrapper,
    });

    expect(
      getByText(
        i18n.translate('xpack.apm.settings.customLink.flyout.filters.title', {
          defaultMessage: 'Filters',
        })
      )
    ).toBeInTheDocument();
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

    const initialFilters: Filter[] = [{ key: 'service.name', value: 'foo' }];
    const onChangeFilters = jest.fn();

    const { getByLabelText, getByTestId, rerender } = render(
      <FiltersSection filters={initialFilters} onChangeFilters={onChangeFilters} />,
      { wrapper: Wrapper }
    );

    const select = getByLabelText('Choose a field to filter by');
    const suggestionsSelect = getByTestId(`comboBoxSearchInput`) as HTMLSelectElement;
    expect(suggestionsSelect.value).toBe('foo');

    await act(async () => {
      fireEvent.change(select, { target: { value: 'transaction.type' } });
    });

    expect(onChangeFilters).toHaveBeenCalledWith([{ key: 'transaction.type', value: '' }]);

    await act(async () => {
      rerender(
        <FiltersSection
          filters={[{ key: 'transaction.type', value: '' }]}
          onChangeFilters={onChangeFilters}
        />
      );
    });

    const suggestionsSelect2 = getByTestId(`comboBoxSearchInput`) as HTMLSelectElement;
    expect(suggestionsSelect2.value).toBe('');
  });

  it('empties the key and the value AND keeps the selects visible, when I have only 1 filter and I delete the filter.', async () => {
    const initialFilters: Filter[] = [{ key: 'service.name', value: 'foo' }];
    const onChangeFilters = jest.fn();
    const { getAllByTestId } = render(
      <FiltersSection filters={initialFilters} onChangeFilters={onChangeFilters} />,
      { wrapper: Wrapper }
    );

    const removeButtons = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons).toHaveLength(1);

    const suggestionsSelect = getAllByTestId(`comboBoxSearchInput`);
    expect(suggestionsSelect).toHaveLength(1);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    expect(removeButtons).toHaveLength(1);
    expect(suggestionsSelect).toHaveLength(1);
  });
  it('when many filters, it deletes the proper filter', async () => {
    const initialFilters: Filter[] = [
      { key: 'service.name', value: 'foo' },
      { key: 'transaction.type', value: 'bar' },
    ];
    const onChangeFilters = jest.fn();
    const { getAllByTestId } = render(
      <FiltersSection filters={initialFilters} onChangeFilters={onChangeFilters} />
    );

    const removeButtons = getAllByTestId('apmCustomLinkFiltersSectionButton');
    expect(removeButtons).toHaveLength(2);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    expect(onChangeFilters).toHaveBeenCalledWith([{ key: 'transaction.type', value: 'bar' }]);
  });
});
