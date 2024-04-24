/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { AxisSettingsPopover, AxisSettingsPopoverProps } from './axis_settings_popover';
import { ToolbarPopover, AxisTicksSettings } from '../../../shared_components';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { ShallowWrapper } from 'enzyme';

jest.useFakeTimers();
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: jest.fn((fn) => fn),
}));

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
      setScaleWithExtent: jest.fn(),
      setExtent: jest.fn(),
      setScale: jest.fn(),
      scale: 'linear',
    };
  });

  it('should disable the popover if the isDisabled property is true', () => {
    const component = shallow(<AxisSettingsPopover {...props} isDisabled />);
    expect(component.find(ToolbarPopover).prop('isDisabled')).toEqual(true);
  });

  it('has the tickLabels switch on by default', () => {
    const component = shallow(
      <AxisTicksSettings
        axis={props.axis}
        isAxisLabelVisible={props.areTickLabelsVisible}
        updateTicksVisibilityState={jest.fn()}
      />
    );
    expect(component.find('[data-test-subj="lnsshowxAxisTickLabels"]').prop('checked')).toBe(true);
  });

  it('has the tickLabels switch off when tickLabelsVisibilitySettings for this axes are false', () => {
    const component = shallow(
      <AxisTicksSettings
        axis="yLeft"
        isAxisLabelVisible={false}
        updateTicksVisibilityState={jest.fn()}
      />
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
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="yLeft"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
        />
      );
      const buttonGroup = getModeButtonsComponent(component).find(
        '[data-test-subj="lnsXY_axisBounds_groups"]'
      );
      expect(buttonGroup.prop('options')).toHaveLength(3);
    });

    it('renders nice values enabled by default if mode is full for metric', () => {
      const component = shallow(
        <AxisSettingsPopover {...props} axis="yLeft" extent={{ mode: 'full' }} />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('should render nice values if mode is custom for metric', () => {
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          axis="yLeft"
        />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('renders metric (y) bound inputs if mode is custom', () => {
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="yLeft"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
        />
      );
      const rangeInput = getRangeInputComponent(component);
      const lower = rangeInput.find('[data-test-subj="lnsXY_axisExtent_lowerBound"]');
      const upper = rangeInput.find('[data-test-subj="lnsXY_axisExtent_upperBound"]');
      expect(lower.prop('value')).toEqual(123);
      expect(upper.prop('value')).toEqual(456);
    });

    it('renders 2 options for bucket bound inputs', () => {
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="x"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
        />
      );
      const buttonGroup = getModeButtonsComponent(component).find(
        '[data-test-subj="lnsXY_axisBounds_groups"]'
      );
      expect(buttonGroup.prop('options')).toHaveLength(2);
    });

    it('should render nice values enabled by default if mode is dataBounds for bucket', () => {
      const component = shallow(
        <AxisSettingsPopover {...props} axis="x" extent={{ mode: 'dataBounds' }} />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('should renders nice values if mode is custom for bucket', () => {
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
          axis="x"
        />
      );
      const niceValuesSwitch = getNiceValueSwitch(component);
      expect(niceValuesSwitch.prop('checked')).toBe(true);
    });

    it('renders bucket (x) bound inputs if mode is custom', () => {
      const component = shallow(
        <AxisSettingsPopover
          {...props}
          axis="x"
          extent={{ mode: 'custom', lowerBound: 123, upperBound: 456 }}
        />
      );
      const rangeInput = getRangeInputComponent(component);
      const lower = rangeInput.find('[data-test-subj="lnsXY_axisExtent_lowerBound"]');
      const upper = rangeInput.find('[data-test-subj="lnsXY_axisExtent_upperBound"]');
      expect(lower.prop('value')).toEqual(123);
      expect(upper.prop('value')).toEqual(456);
    });

    describe('Custom bounds', () => {
      describe('changing scales', () => {
        it('should update extents when scale changes from linear to log scale', () => {
          const component = shallow(
            <AxisSettingsPopover
              {...props}
              scale="linear"
              dataBounds={{ min: 0, max: 1000 }}
              extent={{ mode: 'custom', lowerBound: 0, upperBound: 1000 }}
              axis="yLeft"
            />
          );

          const scaleSelect = component.find('[data-test-subj="lnsScaleSelect"]');
          scaleSelect.simulate('change', { target: { value: 'log' } });

          expect(props.setScaleWithExtent).toBeCalledWith(
            {
              mode: 'custom',
              lowerBound: 0.01,
              upperBound: 1000,
            },
            'log'
          );
        });

        it('should update extent and scale when scale changes from log to linear scale', () => {
          const component = shallow(
            <AxisSettingsPopover
              {...props}
              scale="log"
              dataBounds={{ min: 0, max: 1000 }}
              extent={{ mode: 'custom', lowerBound: 0.01, upperBound: 1000 }}
              axis="yLeft"
            />
          );

          const scaleSelect = component.find('[data-test-subj="lnsScaleSelect"]');
          scaleSelect.simulate('change', { target: { value: 'linear' } });

          expect(props.setScaleWithExtent).toBeCalledWith(
            {
              mode: 'custom',
              lowerBound: 0,
              upperBound: 1000,
            },
            'linear'
          );
        });
      });
    });

    describe('Changing bound type', () => {
      it('should reset y extent when mode changes from custom to full', () => {
        const component = shallow(
          <AxisSettingsPopover
            {...props}
            scale="log"
            dataBounds={{ min: 0, max: 1000 }}
            extent={{ mode: 'custom', lowerBound: 10, upperBound: 1000 }}
            axis="yLeft"
          />
        );

        const boundsBtns = getBoundsButtons(component, 'MetricAxisBoundsControl');

        boundsBtns.full.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'full',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (props.setExtent as jest.Mock).mockClear();
        boundsBtns.custom.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 0.01,
          upperBound: 1000,
        });
      });

      it('should reset y extent when mode changes from custom to data', () => {
        const component = shallow(
          <AxisSettingsPopover
            {...props}
            scale="linear"
            dataBounds={{ min: 0, max: 1000 }}
            extent={{ mode: 'custom', lowerBound: -10, upperBound: 1000 }}
            axis="yRight"
          />
        );

        const boundsBtns = getBoundsButtons(component, 'MetricAxisBoundsControl');

        boundsBtns.data.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'dataBounds',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (props.setExtent as jest.Mock).mockClear();
        boundsBtns.custom.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1000,
        });
      });

      it('should reset x extent when mode changes from custom to data', () => {
        const component = shallow(
          <AxisSettingsPopover
            {...props}
            scale="linear"
            dataBounds={{ min: 100, max: 1000 }}
            extent={{ mode: 'custom', lowerBound: -100, upperBound: 1000 }}
            axis="x"
          />
        );

        const boundsBtns = getBoundsButtons(component, 'BucketAxisBoundsControl');

        boundsBtns.data.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'dataBounds',
          lowerBound: undefined,
          upperBound: undefined,
        });

        (props.setExtent as jest.Mock).mockClear();
        boundsBtns.custom.simulate('click');
        expect(props.setExtent).toBeCalledWith({
          mode: 'custom',
          lowerBound: 100,
          upperBound: 1000,
        });
      });
    });
  });
});

function getBoundsButtons(
  root: ShallowWrapper,
  axisBoundsControl: 'MetricAxisBoundsControl' | 'BucketAxisBoundsControl'
) {
  const btnGroup = root
    .find('AxisBoundsControl')
    .shallow()
    .find(axisBoundsControl)
    .shallow()
    .find('EuiButtonGroup')
    .shallow();

  return {
    full: btnGroup.find('[data-test-subj="lnsXY_axisExtent_groups_full"]'),
    data: btnGroup.find('[data-test-subj="lnsXY_axisExtent_groups_data"]'),
    custom: btnGroup.find('[data-test-subj="lnsXY_axisExtent_groups_custom"]'),
  };
}
