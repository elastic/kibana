/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { FieldTypeIcon } from './field_type_icon';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';

describe('FieldTypeIcon', () => {
  test(`render component when type matches a field type`, () => {
    const typeIconComponent = shallow(
      <FieldTypeIcon type={JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />
    );
    expect(typeIconComponent).toMatchSnapshot();
  });

  test(`render with tooltip and test hovering`, () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

    const typeIconComponent = mount(
      <FieldTypeIcon type={JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />
    );

    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);

    typeIconComponent.simulate('mouseover');

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    typeIconComponent.update();
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(2);

    typeIconComponent.simulate('mouseout');

    // Run the timers so the EuiTooltip will be hidden again
    jest.runAllTimers();

    typeIconComponent.update();
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});
