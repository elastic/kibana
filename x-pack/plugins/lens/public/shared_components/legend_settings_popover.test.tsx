/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import { shallowWithIntl as shallow } from '@kbn/test/jest';
import { LegendSettingsPopover, LegendSettingsPopoverProps } from './legend_settings_popover';

describe('Legend Settings', () => {
  const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> = [
    {
      id: `test_legend_auto`,
      value: 'auto',
      label: 'Auto',
    },
    {
      id: `test_legend_show`,
      value: 'show',
      label: 'Show',
    },
    {
      id: `test_legend_hide`,
      value: 'hide',
      label: 'Hide',
    },
  ];
  let props: LegendSettingsPopoverProps;
  beforeEach(() => {
    props = {
      legendOptions,
      mode: 'auto',
      onDisplayChange: jest.fn(),
      onPositionChange: jest.fn(),
    };
  });

  it('should have selected the given mode as Display value', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lens-legend-display-btn"]').prop('idSelected')).toEqual(
      'test_legend_auto'
    );
  });

  it('should have called the onDisplayChange function on ButtonGroup change', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    component.find('[data-test-subj="lens-legend-display-btn"]').simulate('change');
    expect(props.onDisplayChange).toHaveBeenCalled();
  });

  it('should have default the Position to right when no position is given', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-position-btn"]').prop('idSelected')
    ).toEqual(Position.Right);
  });

  it('should have called the onPositionChange function on ButtonGroup change', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    component.find('[data-test-subj="lens-legend-position-btn"]').simulate('change');
    expect(props.onPositionChange).toHaveBeenCalled();
  });

  it('should disable the position button group on hide mode', () => {
    const component = shallow(<LegendSettingsPopover {...props} mode="hide" />);
    expect(
      component.find('[data-test-subj="lens-legend-position-btn"]').prop('isDisabled')
    ).toEqual(true);
  });

  it('should enable the Nested Legend Switch when renderNestedLegendSwitch prop is true', () => {
    const component = shallow(<LegendSettingsPopover {...props} renderNestedLegendSwitch />);
    expect(component.find('[data-test-subj="lens-legend-nested-switch"]')).toHaveLength(1);
  });

  it('should set the switch state on nestedLegend prop value', () => {
    const component = shallow(
      <LegendSettingsPopover {...props} renderNestedLegendSwitch nestedLegend />
    );
    expect(component.find('[data-test-subj="lens-legend-nested-switch"]').prop('checked')).toEqual(
      true
    );
  });

  it('should have called the onNestedLegendChange function on switch change', () => {
    const nestedProps = {
      ...props,
      renderNestedLegendSwitch: true,
      onNestedLegendChange: jest.fn(),
    };
    const component = shallow(<LegendSettingsPopover {...nestedProps} />);
    component.find('[data-test-subj="lens-legend-nested-switch"]').simulate('change');
    expect(nestedProps.onNestedLegendChange).toHaveBeenCalled();
  });

  it('should disable switch group on hide mode', () => {
    const component = shallow(
      <LegendSettingsPopover {...props} mode="hide" renderNestedLegendSwitch />
    );
    expect(component.find('[data-test-subj="lens-legend-nested-switch"]').prop('disabled')).toEqual(
      true
    );
  });
});
