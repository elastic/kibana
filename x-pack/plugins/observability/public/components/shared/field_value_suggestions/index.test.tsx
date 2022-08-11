/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldValueSuggestions } from '.';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import * as searchHook from '../../../hooks/use_es_search';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

jest.setTimeout(30000);

describe('FieldValueSuggestions', () => {
  jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(1500);
  jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1500);

  function setupSearch(data: any) {
    // @ts-ignore
    jest.spyOn(searchHook, 'useEsSearch').mockReturnValue({
      data: {
        took: 17,
        timed_out: false,
        _shards: { total: 35, successful: 35, skipped: 31, failed: 0 },
        hits: { total: { value: 15299, relation: 'eq' }, hits: [] },
        aggregations: {
          values: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: data,
          },
        },
      },
      loading: false,
    });
  }

  it('renders a list', async () => {
    setupSearch([
      { key: 'US', doc_count: 14132 },
      { key: 'Pak', doc_count: 200 },
      { key: 'Japan', doc_count: 100 },
    ]);

    render(
      <EuiThemeProvider darkMode={false}>
        <FieldValueSuggestions
          label="Service name"
          sourceField={'service'}
          onChange={() => {}}
          selectedValue={[]}
          filters={[]}
          asCombobox={false}
        />
      </EuiThemeProvider>
    );

    fireEvent.click(screen.getByText('Service name'));

    expect(await screen.findByPlaceholderText('Filter Service name')).toBeInTheDocument();
    expect(await screen.findByText('Apply')).toBeInTheDocument();
    expect(await screen.findByText('US')).toBeInTheDocument();
    expect(await screen.findByText('Pak')).toBeInTheDocument();
    expect(await screen.findByText('Japan')).toBeInTheDocument();
    expect(await screen.findByText('14132')).toBeInTheDocument();
    expect(await screen.findByText('200')).toBeInTheDocument();
    expect(await screen.findByText('100')).toBeInTheDocument();

    setupSearch([{ key: 'US', doc_count: 14132 }]);

    fireEvent.input(screen.getByTestId('suggestionInputField'), {
      target: { value: 'u' },
    });

    expect(await screen.findByDisplayValue('u')).toBeInTheDocument();
  });

  it('calls oncChange when applied', async () => {
    setupSearch([
      { key: 'US', doc_count: 14132 },
      { key: 'Pak', doc_count: 200 },
      { key: 'Japan', doc_count: 100 },
    ]);

    const onChange = jest.fn();

    const { rerender } = render(
      <EuiThemeProvider darkMode={false}>
        <FieldValueSuggestions
          label="Service name"
          sourceField={'service'}
          onChange={onChange}
          selectedValue={[]}
          filters={[]}
          asCombobox={false}
          allowExclusions={true}
        />
      </EuiThemeProvider>
    );

    fireEvent.click(screen.getByText('Service name'));

    fireEvent.click(await screen.findByText('US'));
    fireEvent.click(await screen.findByText('Apply'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['US'], []);

    await waitForElementToBeRemoved(() => screen.queryByText('Apply'));

    rerender(
      <EuiThemeProvider darkMode={false}>
        <FieldValueSuggestions
          label="Service name"
          sourceField={'service'}
          onChange={onChange}
          selectedValue={['US']}
          excludedValue={['Pak']}
          filters={[]}
          asCombobox={false}
          allowExclusions={true}
        />
      </EuiThemeProvider>
    );

    fireEvent.click(screen.getByText('Service name'));

    fireEvent.click(await screen.findByText('US'));
    fireEvent.click(await screen.findByText('Pak'));
    fireEvent.click(await screen.findByText('Apply'));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith([], ['US']);
  });
});
