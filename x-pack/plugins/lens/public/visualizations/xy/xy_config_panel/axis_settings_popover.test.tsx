/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { AxisSettingsPopover, AxisSettingsPopoverProps } from './axis_settings_popover';
import { ToolbarPopover } from '../../../shared_components';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { ShallowWrapper } from 'enzyme';

function getExtentControl(root: ShallowWrapper) {
  return root.find('[testSubjPrefix="lnsXY"]').shallow();
}

function getRangeInputComponent(root: ShallowWrapper) {
  return getExtentControl(root)
    .find('RangeInputField')
    .shallow()
    .find('EuiFormControlLayoutDelimited')
    .shallow();
}

function getModeButtonsComponent(root: ShallowWrapper) {
  return getExtentControl(root).find('[testSubjPrefix="lnsXY"]').shallow();
}

function getNiceValueSwitch(root: ShallowWrapper) {
  return getExtentControl(root).find('[data-test-subj="lnsXY_axisExtent_niceValues"]');
}

describe('Axes Settings', () => {
  let props: AxisSettingsPopoverProps;
  beforeEach(() => {
    props = {
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
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
      toggleTickLabelsVisibility: jest.fn(),
      toggleGridlinesVisibility: jest.fn(),
      hasBarOrAreaOnAxis: false,
      hasPercentageAxis: false,
      orientation: 0,
      setOrientation: jest.fn(),
    };
  });

  it('should disable the popover if the isDisabled property is true', () => {
    const component = shallow(<AxisSettingsPopover {...props} isDisabled />);
    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
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

  it('has selected the horizontal option on the orientation group', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(
      component.find('[data-test-subj="lnsXY_axisOrientation_groups"]').prop('idSelected')
    ).toEqual('xy_axis_orientation_horizontal');
  });

  it('should have called the setOrientation function on orientation button group change', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    component
      .find('[data-test-subj="lnsXY_axisOrientation_groups"]')
      .simulate('change', 'xy_axis_orientation_angled');
    expect(props.setOrientation).toHaveBeenCalled();
  });

  it('should hide the orientation group if the tickLabels are set to not visible', () => {
    const component = shallow(<AxisSettingsPopover {...props} areTickLabelsVisible={false} />);
    expect(component.exists('[data-test-subj="lnsXY_axisOrientation_groups"]')).toEqual(false);
  });

  it('hides the endzone visibility flag if no setter is passed in', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lnsshowEndzones"]').length).toBe(0);
  });

  it('shows the switch if setter is present', () => {
    const component = shallow(
      <AxisSettingsPopover {...props} endzonesVisible={true} setEndzoneVisibility={() => {}} />
    );
    expect(component.find('[data-test-subj="lnsshowEndzones"]').prop('checked')).toBe(true);
  });

  it('hides the current time marker visibility flag if no setter is passed in', () => {
    const component = shallow(<AxisSettingsPopover {...props} />);
    expect(component.find('[data-test-subj="lnsshowCurrentTimeMarker"]')).toHaveLength(0);
  });

  it('shows the current time marker switch if setter is present', () => {
    const mockToggle = jest.fn();
    const component = shallow(
      <AxisSettingsPopover
        {...props}
        currentTimeMarkerVisible={false}
        setCurrentTimeMarkerVisibility={mockToggle}
      />
    );
    const switchElement = component.find('[data-test-subj="lnsshowCurrentTimeMarker"]');
    expect(switchElement.prop('checked')).toBe(false);

    switchElement.simulate('change');

    expect(mockToggle).toHaveBeenCalledWith(true);
  });

  describe('axis extent', () => {
    it('hides the extent section if no extent is passed in', () => {
      const component = shallow(<AxisSettingsPopover {...props} />);
      expect(component.find('[testSubjPrefix="lnsXY"]').isEmptyRender()).toBe(true);
    });

    it('renders 3 options for metric bound inputs', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="yLeft"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          setExtent={setSpy}
        />
      );
      const buttonGroup = getModeButtonsComponent(component).find(
        '[data-test-subj="lnsXY_axisBounds_groups"]'
      );
      expect(buttonGroup.prop('options')).toHaveLength(3);
    });

    it('renders nice values enabled by default if mode is full for metric', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover {...props} axis="yLeft" extent={{ mode: 'full' }} setExtent={setSpy} />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('should not renders nice values if mode is custom for metric', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          axis="yLeft"
          setExtent={setSpy}
        />
      );
      expect(
        getExtentControl(component)
          .find('[data-test-subj="lnsXY_axisExtent_niceValues"]')
          .isEmptyRender()
      ).toBe(true);
    });

    it('renders metric (y) bound inputs if mode is custom', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="yLeft"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          setExtent={setSpy}
        />
      );
      const rangeInput = getRangeInputComponent(component);
      const lower = rangeInput.find('[data-test-subj="lnsXY_axisExtent_lowerBound"]');
      const upper = rangeInput.find('[data-test-subj="lnsXY_axisExtent_upperBound"]');
      expect(lower.prop('value')).toEqual(123);
      expect(upper.prop('value')).toEqual(456);
    });

    it('renders 2 options for bucket bound inputs', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="x"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          setExtent={setSpy}
        />
      );
      const buttonGroup = getModeButtonsComponent(component).find(
        '[data-test-subj="lnsXY_axisBounds_groups"]'
      );
      expect(buttonGroup.prop('options')).toHaveLength(2);
    });

    it('renders nice values enabled by default if mode is dataBounds for bucket', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="x"
          extent={{ mode: 'dataBounds' }}
          setExtent={setSpy}
        />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('should not renders nice values if mode is custom for bucket', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          axis="x"
          setExtent={setSpy}
        />
      );
      expect(
        getExtentControl(component)
          .find('[data-test-subj="lnsXY_axisExtent_niceValues"]')
          .isEmptyRender()
      ).toBe(true);
    });

    it('renders bucket (x) bound inputs if mode is custom', () => {
      const setSpy = jest.fn();
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="x"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          setExtent={setSpy}
        />
      );
      const rangeInput = getRangeInputComponent(component);
      const lower = rangeInput.find('[data-test-subj="lnsXY_axisExtent_lowerBound"]');
      const upper = rangeInput.find('[data-test-subj="lnsXY_axisExtent_upperBound"]');
      expect(lower.prop('value')).toEqual(123);
      expect(upper.prop('value')).toEqual(456);
    });
  });
});
