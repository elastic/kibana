/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { TestProviders, useFormFieldMock } from '../../../../common/mock';
import { useEqlValidation } from '../../../../common/hooks/eql/use_eql_validation';
import {
  getEqlValidationResponseMock,
  getValidEqlValidationResponseMock,
} from '../../../../../common/detection_engine/schemas/response/eql_validation_schema.mock';
import { mockQueryBar } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { EqlQueryBar, EqlQueryBarProps } from './eql_query_bar';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/eql/use_eql_validation');

describe('EqlQueryBar', () => {
  let mockField: EqlQueryBarProps['field'];
  let mockIndex: string[];

  beforeEach(() => {
    (useEqlValidation as jest.Mock).mockReturnValue({
      result: getValidEqlValidationResponseMock(),
    });
    mockIndex = ['index-123*'];
    mockField = useFormFieldMock({
      value: mockQueryBar,
    });
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <EqlQueryBar index={mockIndex} dataTestSubj="myQueryBar" field={mockField} />
    );

    expect(wrapper.find('[data-test-subj="myQueryBar"]')).toHaveLength(1);
  });

  it('sets the field value on input change', () => {
    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar index={mockIndex} dataTestSubj="myQueryBar" field={mockField} />
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
        <EqlQueryBar index={mockIndex} dataTestSubj="myQueryBar" field={mockField} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]').exists()).toEqual(
      false
    );
  });

  it('renders errors for an invalid query', () => {
    (useEqlValidation as jest.Mock).mockReturnValue({
      result: getEqlValidationResponseMock(),
    });

    const wrapper = mount(
      <TestProviders>
        <EqlQueryBar index={mockIndex} dataTestSubj="myQueryBar" field={mockField} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]').exists()).toEqual(true);
  });
});
