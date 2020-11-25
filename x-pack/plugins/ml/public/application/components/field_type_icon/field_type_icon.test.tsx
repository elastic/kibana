/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { FieldTypeIcon } from './field_type_icon';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';

describe('FieldTypeIcon', () => {
  test(`render component when type matches a field type`, () => {
    const typeIconComponent = shallow(
      <FieldTypeIcon type={ML_JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} needsAria={false} />
    );
    expect(typeIconComponent).toMatchSnapshot();
  });

  test(`render with tooltip and test hovering`, () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

    const typeIconComponent = mount(
      <FieldTypeIcon type={ML_JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} needsAria={false} />
    );
    const container = typeIconComponent.find({ 'data-test-subj': 'mlFieldTypeIcon' });

    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);

    container.simulate('mouseover');

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    typeIconComponent.update();
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseout');

    // Run the timers so the EuiTooltip will be hidden again
    jest.runAllTimers();

    typeIconComponent.update();
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});
