/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TestProviders } from '../../../common/mock';
import {
  DataProviderType,
  IS_OPERATOR,
  EXISTS_OPERATOR,
  IS_ONE_OF_OPERATOR,
} from '../timeline/data_providers/data_provider';

import { StatefulEditDataProvider } from '.';

describe('StatefulEditDataProvider', () => {
  const field = 'client.address';
  const timelineId = 'test';
  const value = 'test-host';

  test('it renders the current field', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText(field)).toBeInTheDocument();
  });

  test('it renders the expected placeholder for the current field when field is empty', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText(/Select a field/)).toBeInTheDocument();
  });

  test('it renders the "is" operator in a humanized format', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('is')).toBeInTheDocument();
  });

  test('it renders the negated "is" operator in a humanized format when isExcluded is true', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('is not')).toBeInTheDocument();
  });

  test('it renders the "exists" operator in human-readable format', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('exists')).toBeInTheDocument();
  });

  test('it renders the negated "exists" operator in a humanized format when isExcluded is true', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('does not exist')).toBeInTheDocument();
  });

  test('it renders the "is one of" operator in human-readable format', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_ONE_OF_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('is one of')).toBeInTheDocument();
  });

  test('it renders the negated "is one of" operator in a humanized format when isExcluded is true', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={IS_ONE_OF_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByText('is not one of')).toBeInTheDocument();
  });

  test('it renders the current value when the operator is "is"', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByDisplayValue(value)).toBeInTheDocument();
  });

  test('it renders the current value when the type of value is an array', () => {
    const reallyAnArray = [value] as unknown as string;

    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={reallyAnArray}
        />
      </TestProviders>
    );

    expect(screen.getByDisplayValue(value)).toBeInTheDocument();
  });

  test('it handles bad values when the operator is "is one of" by showing default placholder', () => {
    const reallyAnArrayOfBadValues = [undefined, null] as unknown as string[];
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_ONE_OF_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={reallyAnArrayOfBadValues}
        />
      </TestProviders>
    );
    expect(screen.getByText('enter one or more values')).toBeInTheDocument();
  });

  test('it renders selected values when the type of value is an array and the operator is "is one of"', () => {
    const values = ['apple', 'banana', 'cherry'];
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_ONE_OF_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={values}
        />
      </TestProviders>
    );
    expect(screen.getByText(values[0])).toBeInTheDocument();
    expect(screen.getByText(values[1])).toBeInTheDocument();
    expect(screen.getByText(values[2])).toBeInTheDocument();
  });

  test('it does NOT render the current value when the operator is "is not" (isExcluded is true)', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByDisplayValue(value)).toBeInTheDocument();
  });

  test('it renders the expected placeholder when value is empty', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value=""
        />
      </TestProviders>
    );

    expect(screen.getByPlaceholderText('value')).toBeInTheDocument();
  });

  test('it renders the expected placeholder when value is empty and operator is "is one of"', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_ONE_OF_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={[]}
        />
      </TestProviders>
    );

    // EuiCombobox does not render placeholder text with placeholder tag
    expect(screen.getByText('enter one or more values')).toBeInTheDocument();
  });

  test('it does NOT render value when the operator is "exists"', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.queryByPlaceholderText('value')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Value')).not.toBeInTheDocument();
  });

  test('it does NOT render value when the operator is "not exists" (isExcluded is true)', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.queryByPlaceholderText('value')).not.toBeInTheDocument();
  });

  test('it does NOT render value when is template field', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={true}
          onDataProviderEdited={jest.fn()}
          operator={EXISTS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
          type={DataProviderType.template}
        />
      </TestProviders>
    );

    expect(screen.queryByPlaceholderText('value')).not.toBeInTheDocument();
  });

  test('it does NOT disable the save button when field is valid', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('save')).not.toBeDisabled();
  });

  test('it disables the save button when field is invalid because it is empty', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('save')).toBeDisabled();
  });

  test('it disables the save button when field is invalid because it is not contained in the browser fields', () => {
    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field="not-in-browser-fields"
          isExcluded={false}
          onDataProviderEdited={jest.fn()}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('save')).toBeDisabled();
  });

  test('it invokes onDataProviderEdited with the expected values when the user clicks the save button', () => {
    const onDataProviderEdited = jest.fn();

    render(
      <TestProviders>
        <StatefulEditDataProvider
          andProviderId={undefined}
          browserFields={mockBrowserFields}
          field={field}
          isExcluded={false}
          onDataProviderEdited={onDataProviderEdited}
          operator={IS_OPERATOR}
          providerId={`hosts-table-hostName-${value}`}
          timelineId={timelineId}
          value={value}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('save'));

    expect(onDataProviderEdited).toBeCalledWith({
      andProviderId: undefined,
      excluded: false,
      field: 'client.address',
      id: 'test',
      operator: ':',
      type: 'default',
      providerId: 'hosts-table-hostName-test-host',
      value: 'test-host',
    });
  });
});
