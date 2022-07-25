/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DataViewSelector } from '.';
import { useFormFieldMock } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

describe('data_view_selector', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock({ value: '' });
      // @ts-expect-error TODO: FIX THIS
      return <DataViewSelector kibanaDataViews={{}} setIndexPattern={jest.fn()} field={field} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="pick-rule-data-source"]')).toHaveLength(1);
  });
});
