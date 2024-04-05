/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { render, screen, fireEvent } from '@testing-library/react';

import { mockIndexPattern, TestProviders, useFormFieldMock } from '../../../../common/mock';
import { mockQueryBar } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import type { EqlQueryBarProps } from './eql_query_bar';
import { EqlQueryBar } from './eql_query_bar';
import { getEqlValidationError } from './validators.mock';
import { fireEvent, render, within } from '@testing-library/react';

jest.mock('../../../../common/lib/kibana');

describe('EqlQueryBar', () => {
  let mockField: EqlQueryBarProps['field'];

  beforeEach(() => {
    mockField = useFormFieldMock({
      value: mockQueryBar,
    });
  });

  it('should render correctly', () => {
    const wrapper = shallow(
      <EqlQueryBar
        dataTestSubj="myQueryBar"
        field={mockField}
        isLoading={false}
        indexPattern={mockIndexPattern}
      />
    );

    expect(wrapper.find('[data-test-subj="myQueryBar"]')).toHaveLength(1);
  });

  it('renders correctly filter bar', () => {
    const wrapper = shallow(
      <EqlQueryBar
        dataTestSubj="myQueryBar"
        field={mockField}
        isLoading={false}
        indexPattern={mockIndexPattern}
        showFilterBar={true}
      />
    );

    expect(wrapper.find('[data-test-subj="unifiedQueryInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="eqlFilterBar"]')).toHaveLength(1);
  });

  it('should set the field value on input change', () => {
    render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );
    const inputElement = screen.getByTestId('eqlQueryBarTextInput');
    fireEvent.change(inputElement, { target: { value: 'newQuery' } });

    const expected = {
      filters: mockQueryBar.filters,
      query: {
        query: 'newQuery',
        language: 'eql',
      },
      saved_id: null,
    };

    expect(mockField.setValue).toHaveBeenCalledWith(expected);
  });

  it('should not render errors for a valid query', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(queryByTestId('eql-validation-errors-popover')).not.toBeInTheDocument();
  });

  it('should render errors for an invalid query', () => {
    const invalidMockField = useFormFieldMock({
      value: mockQueryBar,
      errors: [getEqlValidationError()],
    });
    const { getByTestId } = render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={invalidMockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(getByTestId('eql-validation-errors-popover')).toBeInTheDocument();
  });

  describe('onUsingSequenceQuery', () => {
    it('should call onUsingSequenceQuery with true when input starts with "sequence"', () => {
      const mockOnUsingSequenceQuery = jest.fn();

      render(
        <TestProviders>
          <EqlQueryBar
            dataTestSubj="test-subject"
            field={mockField}
            isLoading={false}
            indexPattern={mockIndexPattern}
            onUsingSequenceQuery={mockOnUsingSequenceQuery}
          />
        </TestProviders>
      );

      const inputElement = screen.getByTestId('eqlQueryBarTextInput');
      fireEvent.change(inputElement, { target: { value: 'sequence someQuery' } });

      expect(mockOnUsingSequenceQuery).toHaveBeenCalledWith(true);
    });

    it('should call onUsingSequenceQuery with false when input does not start with "sequence"', () => {
      const mockOnUsingSequenceQuery = jest.fn();

      render(
        <TestProviders>
          <EqlQueryBar
            dataTestSubj="test-subject"
            field={mockField}
            isLoading={false}
            indexPattern={mockIndexPattern}
            onUsingSequenceQuery={mockOnUsingSequenceQuery}
          />
        </TestProviders>
      );

      const inputElement = screen.getByTestId('eqlQueryBarTextInput');
      fireEvent.change(inputElement, { target: { value: 'someQuery' } });

      expect(mockOnUsingSequenceQuery).toHaveBeenCalledWith(false);
    });

    it('should call onUsingSequenceQuery with false when input is an empty string', () => {
      const mockOnUsingSequenceQuery = jest.fn();

      render(
        <TestProviders>
          <EqlQueryBar
            dataTestSubj="test-subject"
            field={mockField}
            isLoading={false}
            indexPattern={mockIndexPattern}
            onUsingSequenceQuery={mockOnUsingSequenceQuery}
          />
        </TestProviders>
      );

      const inputElement = screen.getByTestId('eqlQueryBarTextInput');
      fireEvent.change(inputElement, { target: { value: '' } });

      expect(mockOnUsingSequenceQuery).toHaveBeenCalledWith(false);
    });
  });

  describe('EQL options interaction', () => {
    const mockOptionsData = {
      keywordFields: [],
      dateFields: [{ label: 'timestamp', value: 'timestamp' }],
      nonDateFields: [],
    };

    it('invokes onOptionsChange when the EQL options change', () => {
      const onOptionsChangeMock = jest.fn();

      const { getByTestId, getByText } = render(
        <TestProviders>
          <EqlQueryBar
            dataTestSubj="myQueryBar"
            field={mockField}
            isLoading={false}
            optionsData={mockOptionsData}
            indexPattern={mockIndexPattern}
            onOptionsChange={onOptionsChangeMock}
          />
        </TestProviders>
      );

      // open options popover
      fireEvent.click(getByTestId('eql-settings-trigger'));
      // display combobox options
      within(getByTestId(`eql-timestamp-field`)).getByRole('combobox').focus();
      // select timestamp
      getByText('timestamp').click();

      expect(onOptionsChangeMock).toHaveBeenCalledWith('timestampField', 'timestamp');
    });
  });
});
