/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { useFormFieldMock } from '../../../../common/mock';
import { mockQueryBar } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { EqlQueryBar, EqlQueryBarProps } from './eql_query_bar';

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
    const wrapper = mount(<EqlQueryBar dataTestSubj="myQueryBar" field={mockField} />);

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
});
