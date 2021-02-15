/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AnomalyThresholdSlider } from './index';
import { useFormFieldMock } from '../../../../common/mock';

describe('AnomalyThresholdSlider', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return <AnomalyThresholdSlider describedByIds={[]} field={field} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('EuiRange')).toHaveLength(1);
  });
});
