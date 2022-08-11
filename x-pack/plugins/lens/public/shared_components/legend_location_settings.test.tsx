/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { LegendLocationSettings, LegendLocationSettingsProps } from './legend_location_settings';

describe('Legend Location Settings', () => {
  let props: LegendLocationSettingsProps;
  beforeEach(() => {
    props = {
      onLocationChange: jest.fn(),
      onPositionChange: jest.fn(),
    };
  });

  it('should have default the Position to right when no position is given', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    expect(
      component.find('[data-test-subj="lens-legend-position-btn"]').prop('idSelected')
    ).toEqual(Position.Right);
  });

  it('should have called the onPositionChange function on ButtonGroup change', () => {
    const component = shallow(<LegendLocationSettings {...props} />);
    component.find('[data-test-subj="lens-legend-position-btn"]').simulate('change');
    expect(props.onPositionChange).toHaveBeenCalled();
  });

  it('should hide the position group if isDisabled prop is true', () => {
    const component = shallow(<LegendLocationSettings {...props} isDisabled />);
    expect(component.exists('[data-test-subj="lens-legend-position-btn"]')).toEqual(false);
  });

  it('should hide the position button group if location inside is given', () => {
    const newProps = {
      ...props,
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    expect(component.find('[data-test-subj="lens-legend-position-btn"]').length).toEqual(0);
  });

  it('should render the location settings if location inside is given', () => {
    const newProps = {
      ...props,
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    expect(component.find('[data-test-subj="lens-legend-location-btn"]').length).toEqual(1);
  });

  it('should have selected the given location', () => {
    const newProps = {
      ...props,
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    expect(
      component.find('[data-test-subj="lens-legend-location-btn"]').prop('idSelected')
    ).toEqual('xy_location_inside');
  });

  it('should have called the onLocationChange function on ButtonGroup change', () => {
    const newProps = {
      ...props,
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    component
      .find('[data-test-subj="lens-legend-location-btn"]')
      .simulate('change', 'xy_location_outside');
    expect(props.onLocationChange).toHaveBeenCalled();
  });

  it('should default the alignment to top right when no value is given', () => {
    const newProps = {
      ...props,
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    expect(
      component.find('[data-test-subj="lens-legend-inside-alignment-btn"]').prop('idSelected')
    ).toEqual('xy_location_alignment_top_right');
  });

  it('should have called the onAlignmentChange function on ButtonGroup change', () => {
    const newProps = {
      ...props,
      onAlignmentChange: jest.fn(),
      location: 'inside',
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    component
      .find('[data-test-subj="lens-legend-inside-alignment-btn"]')
      .simulate('change', 'xy_location_alignment_top_left');
    expect(newProps.onAlignmentChange).toHaveBeenCalled();
  });

  it('should hide the components when is Disabled is true', () => {
    const newProps = {
      ...props,
      location: 'inside',
      isDisabled: true,
    } as LegendLocationSettingsProps;
    const component = shallow(<LegendLocationSettings {...newProps} />);
    expect(component.exists('[data-test-subj="lens-legend-location-btn"]')).toEqual(false);
    expect(component.exists('[data-test-subj="lens-legend-inside-alignment-btn"]')).toEqual(false);
  });
});
