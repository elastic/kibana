/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import {
  LegendSettingsPopover,
  LegendSettingsPopoverProps,
  MaxLinesInput,
} from './legend_settings_popover';

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
      onLegendSizeChange: jest.fn(),
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

  it('should have default the max lines input to 1 when no value is given', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    expect(component.find(MaxLinesInput).prop('value')).toEqual(1);
  });

  it('should have the `Truncate legend text` switch enabled by default', () => {
    const component = shallow(<LegendSettingsPopover {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-truncate-switch"]').prop('checked')
    ).toEqual(true);
  });

  it('should set the truncate switch state when truncate prop value is false', () => {
    const component = shallow(<LegendSettingsPopover {...props} shouldTruncate={false} />);
    expect(
      component.find('[data-test-subj="lens-legend-truncate-switch"]').prop('checked')
    ).toEqual(false);
  });

  it('should have disabled the max lines input when truncate is set to false', () => {
    const component = shallow(<LegendSettingsPopover {...props} shouldTruncate={false} />);
    expect(component.find(MaxLinesInput).prop('isDisabled')).toEqual(true);
  });

  it('should have called the onTruncateLegendChange function on truncate switch change', () => {
    const nestedProps = {
      ...props,
      shouldTruncate: true,
      onTruncateLegendChange: jest.fn(),
    };
    const component = shallow(<LegendSettingsPopover {...nestedProps} />);
    component.find('[data-test-subj="lens-legend-truncate-switch"]').simulate('change');
    expect(nestedProps.onTruncateLegendChange).toHaveBeenCalled();
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
