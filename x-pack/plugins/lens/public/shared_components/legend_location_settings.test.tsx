/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { shallowWithIntl as shallow, mountWithIntl as mount } from '@kbn/test/jest';
import { LegendLocationSettings, LegendLocationSettingsProps } from './legend_location_settings';

describe('Legend Location Settings', () => {
  let props: LegendLocationSettingsProps;
  beforeEach(() => {
    props = {
      location: 'inside',
      onLocationChange: jest.fn(),
    };
  });

  it('should have selected the given location', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-location-btn"]').prop('idSelected')
    ).toEqual('xy_location_inside');
  });

  it('should have called the onLocationChange function on ButtonGroup change', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    component
      .find('[data-test-subj="lens-legend-location-btn"]')
      .simulate('change', 'xy_location_outside');
    expect(props.onLocationChange).toHaveBeenCalled();
  });

  it('should have default the Vertical alignment to top when no value is given', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-inside-valign-btn"]').prop('idSelected')
    ).toEqual(VerticalAlignment.Top);
  });

  it('should have default the Horizontal alignment to right when no value is given', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-inside-halign-btn"]').prop('idSelected')
    ).toEqual(HorizontalAlignment.Right);
  });

  it('should have called the onAlignmentChange function on ButtonGroup change', () => {
    const newProps = { ...props, onAlignmentChange: jest.fn() };
    const component = shallow(<LegendLocationSettings {...newProps} />);
    component.find('[data-test-subj="lens-legend-inside-halign-btn"]').simulate('change');
    expect(newProps.onAlignmentChange).toHaveBeenCalled();
  });

  it('should have default the columns slider to 1 when no value is given', () => {
    const component = mount(<LegendLocationSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-location-columns-slider"]').at(0).prop('value')
    ).toEqual(1);
  });

  it('should disable the components when is Disabled is true', () => {
    const component = shallow(<LegendLocationSettings {...props} isDisabled={true} />);
    expect(
      component.find('[data-test-subj="lens-legend-location-btn"]').prop('isDisabled')
    ).toEqual(true);
    expect(
      component.find('[data-test-subj="lens-legend-inside-valign-btn"]').prop('isDisabled')
    ).toEqual(true);
    expect(
      component.find('[data-test-subj="lens-legend-inside-halign-btn"]').prop('isDisabled')
    ).toEqual(true);
  });
});
