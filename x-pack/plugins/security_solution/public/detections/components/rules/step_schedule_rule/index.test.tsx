/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { StepScheduleRule } from '.';
import { getStepScheduleDefaultValue } from '../../../pages/detection_engine/rules/utils';

describe('StepScheduleRule', () => {
  it('renders correctly', () => {
    const wrapper = mount(
      <StepScheduleRule
        isReadOnlyView={false}
        isLoading={false}
        defaultValues={getStepScheduleDefaultValue('query')}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('Form[data-test-subj="stepScheduleRule"]')).toHaveLength(1);
  });

  it('renders correctly if isReadOnlyView', () => {
    const wrapper = shallow(
      <StepScheduleRule
        isReadOnlyView={true}
        isLoading={false}
        defaultValues={getStepScheduleDefaultValue('query')}
      />
    );

    expect(wrapper.find('StepContentWrapper')).toHaveLength(1);
  });
});
