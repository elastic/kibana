/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ThrottleSelectField } from './index';
import { useFormFieldMock } from '../../../../common/mock';

describe('ThrottleSelectField', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return <ThrottleSelectField field={field} euiFieldProps={{ options: [] }} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('SelectField')).toHaveLength(1);
  });
});
