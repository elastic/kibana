/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { AxisTitleSettings, AxisTitleSettingsProps } from './axis_title_settings';
import { Label, VisLabel } from './vis_label';

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
    const component = mount(<AxisTitleSettings {...props} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').last().prop('value')).toBe(
      'My custom X axis title'
    );
  });

  it('should set the mode to Auto if no title is passed over', () => {
    const component = mount(<AxisTitleSettings {...props} axisTitle={undefined} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').last().prop('value')).toBe('');
  });

  it('should set the mode to Auto if empty title is passed over', () => {
    const component = mount(<AxisTitleSettings {...props} axisTitle={''} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').last().prop('value')).toBe('');
  });

  it('should disable the input text if the switch is off', () => {
    const component = mount(<AxisTitleSettings {...props} isAxisTitleVisible={false} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').last().prop('disabled')).toBe(true);
  });

  it('should allow custom mode on user input even with empty string', () => {
    let component = mount(<AxisTitleSettings {...props} axisTitle={''} />);

    // switch mode
    act(() => {
      component.find(VisLabel).prop('handleChange')!({
        label: '',
        mode: 'custom',
      } as Label);
    });
    component = component.update();
    expect(component.find('[data-test-subj="lnsxAxisTitle-select"]').last().prop('value')).toBe(
      'custom'
    );
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').last().prop('value')).toBe('');
  });
});
