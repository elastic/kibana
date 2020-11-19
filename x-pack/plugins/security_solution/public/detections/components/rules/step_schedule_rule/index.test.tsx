/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { StepScheduleRule } from './index';

describe('StepScheduleRule', () => {
  it('renders correctly', () => {
    const wrapper = mount(<StepScheduleRule isReadOnlyView={false} isLoading={false} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('Form[data-test-subj="stepScheduleRule"]')).toHaveLength(1);
  });

  it('renders correctly if isReadOnlyView', () => {
    const wrapper = shallow(<StepScheduleRule isReadOnlyView={true} isLoading={false} />);

    expect(wrapper.find('StepContentWrapper')).toHaveLength(1);
  });
});
