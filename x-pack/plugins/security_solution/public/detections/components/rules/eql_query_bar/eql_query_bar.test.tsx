/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { mockIndexPattern, TestProviders, useFormFieldMock } from '../../../../common/mock';
import { mockQueryBar } from '../../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import type { EqlQueryBarProps } from './eql_query_bar';
import { EqlQueryBar } from './eql_query_bar';
import { getEqlValidationError } from './validators.mock';

jest.mock('../../../../common/lib/kibana');

describe('EqlQueryBar', () => {
  let mockField: EqlQueryBarProps['field'];

  beforeEach(() => {
    mockField = useFormFieldMock({
      value: mockQueryBar,
    });
  });

  it('renders correctly', () => {
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

  it('sets the field value on input change', () => {
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="eqlQueryBarTextInput"]')
      .first()
      .simulate('change', { target: { value: 'newQuery' } });

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

  it('does not render errors for a valid query', () => {
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]').exists()).toEqual(
      false
    );
  });

  it('renders errors for an invalid query', () => {
    const invalidMockField = useFormFieldMock({
      value: mockQueryBar,
      errors: [getEqlValidationError()],
    });
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={invalidMockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]').exists()).toEqual(true);
  });
});
