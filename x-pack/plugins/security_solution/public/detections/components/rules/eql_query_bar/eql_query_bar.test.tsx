/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { TestProviders, useFormFieldMock } from '../../../../common/mock';
import { mockQueryBar } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { EqlQueryBar, EqlQueryBarProps } from './eql_query_bar';
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
    const wrapper = shallow(<EqlQueryBar dataTestSubj="myQueryBar" field={mockField} />);

    expect(wrapper.find('[data-test-subj="myQueryBar"]')).toHaveLength(1);
  });

  it('sets the field value on input change', () => {
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar dataTestSubj="myQueryBar" field={mockField} />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="eqlQueryBarTextInput"]')
      .first()
      .simulate('change', { target: { value: 'newQuery' } });

    const expected = {
      filters: [],
      query: {
        query: 'newQuery',
        language: 'eql',
      },
    };

    expect(mockField.setValue).toHaveBeenCalledWith(expected);
  });

  it('does not render errors for a valid query', () => {
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar dataTestSubj="myQueryBar" field={mockField} />
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
        <EqlQueryBar dataTestSubj="myQueryBar" field={invalidMockField} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]').exists()).toEqual(true);
  });
});
