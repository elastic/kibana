/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { AxisTitleSettings, AxisTitleSettingsProps } from './axis_title_settings';

describe('Axes Title settings', () => {
  let props: AxisTitleSettingsProps;
  beforeEach(() => {
    props = {
      axisTitle: 'My custom X axis title',
      axis: 'x',
      isAxisTitleVisible: true,
      toggleAxisTitleVisibility: jest.fn(),
      updateTitleState: jest.fn(),
    };
  });
  it('should show the axes title on the corresponding input text', () => {
    const component = shallow(<AxisTitleSettings {...props} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').prop('value')).toBe(
      'My custom X axis title'
    );
  });

  it('should disable the input text if the switch is off', () => {
    const component = shallow(<AxisTitleSettings {...props} isAxisTitleVisible={false} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').prop('disabled')).toBe(true);
  });
});
