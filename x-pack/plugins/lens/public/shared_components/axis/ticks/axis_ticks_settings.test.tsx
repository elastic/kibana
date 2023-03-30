/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { AxisTicksSettings, AxisTicksSettingsProps } from './axis_ticks_settings';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

describe('Axes Ticks settings', () => {
  let props: AxisTicksSettingsProps;
  beforeEach(() => {
    props = {
      isAxisLabelVisible: true,
      axis: 'x',
      updateTicksVisibilityState: jest.fn(),
    };
  });
  it('should show the ticks switch as on', () => {
    const component = mount(<AxisTicksSettings {...props} />);
    expect(
      component.find('[data-test-subj="lnsshowxAxisTickLabels"]').first().prop('checked')
    ).toBe(true);
  });

  it('should show the ticks switch as off is the isAxisLabelVisible is set to false', () => {
    const component = mount(<AxisTicksSettings {...props} isAxisLabelVisible={false} />);
    expect(
      component.find('[data-test-subj="lnsshowxAxisTickLabels"]').first().prop('checked')
    ).toBe(false);
  });

  it('should call the updateTicksVisibilityState when changing the switch status', () => {
    const updateTicksVisibilityStateSpy = jest.fn();
    const component = mount(
      <AxisTicksSettings {...props} updateTicksVisibilityState={updateTicksVisibilityStateSpy} />
    );

    // switch mode
    act(() => {
      component.find(EuiSwitch).first().prop('onChange')({
        target: { checked: false },
      } as EuiSwitchEvent);
    });

    expect(updateTicksVisibilityStateSpy.mock.calls.length).toBe(1);
  });
});
