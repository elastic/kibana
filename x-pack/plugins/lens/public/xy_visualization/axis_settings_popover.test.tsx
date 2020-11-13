/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test/jest';
import { AxisSettingsPopover, AxisSettingsPopoverProps } from './axis_settings_popover';
import { ToolbarPopover } from '../shared_components';

describe('Axes Settings', () => {
  let props: AxisSettingsPopoverProps;
  beforeEach(() => {
    props = {
      layers: [
        {
          seriesType: 'bar',
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
      updateTitleState: jest.fn(),
      axisTitle: 'My custom X axis title',
      axis: 'x',
      areTickLabelsVisible: true,
      areGridlinesVisible: true,
      isAxisTitleVisible: true,
      toggleAxisTitleVisibility: jest.fn(),
      toggleTickLabelsVisibility: jest.fn(),
      toggleGridlinesVisibility: jest.fn(),
    };
  });

  it('should disable the popover if the isDisabled property is true', () => {
    const component = shallow(<AxisSettingsPopover {...props} isDisabled />);
    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
  });

  it('should show the axes title on the corresponding input text', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').prop('value')).toBe(
      'My custom X axis title'
    );
  });

  it('should disable the input text if the switch is off', () => {
    const component = shallow(<AxisSettingsPopover {...props} isAxisTitleVisible={false} />);
    expect(component.find('[data-test-subj="lnsxAxisTitle"]').prop('disabled')).toBe(true);
  });

  it('has the tickLabels switch on by default', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lnsshowxAxisTickLabels"]').prop('checked')).toBe(true);
  });

  it('has the tickLabels switch off when tickLabelsVisibilitySettings for this axes are false', () => {
    const component = shallow(
      <AxisSettingsPopover {...props} axis="yLeft" areTickLabelsVisible={false} />
    );
    expect(component.find('[data-test-subj="lnsshowyLeftAxisTickLabels"]').prop('checked')).toBe(
      false
    );
  });

  it('has the gridlines switch on by default', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lnsshowxAxisGridlines"]').prop('checked')).toBe(true);
  });

  it('has the gridlines switch off when gridlinesVisibilitySettings for this axes are false', () => {
    const component = shallow(
      <AxisSettingsPopover {...props} axis="yRight" areGridlinesVisible={false} />
    );
    expect(component.find('[data-test-subj="lnsshowyRightAxisGridlines"]').prop('checked')).toBe(
      false
    );
  });
});
