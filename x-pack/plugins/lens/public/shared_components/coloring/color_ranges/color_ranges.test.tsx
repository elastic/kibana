/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPicker } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ColorRanges, ColorRangesProps } from './color_ranges';

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

describe('Color Ranges component', () => {
  let props: ColorRangesProps;
  beforeEach(() => {
    props = {
      colorRanges: [
        { color: '#aaa', start: 20, end: 40 },
        { color: '#bbb', start: 40, end: 60 },
        { color: '#ccc', start: 60, end: 80 },
      ],
      paletteConfiguration: {
        rangeType: 'number',
      },
      dataBounds: { min: 0, max: 200 },
      onChange: jest.fn(),
    };
  });
  it('should display all the color ranges passed', () => {
    const component = mountWithIntl(<ColorRanges {...props} />);
    expect(component.find('input[data-test-subj^="dynamicColoring_range_value_"]')).toHaveLength(4);
  });

  it('should disable "add new" button if there is maxStops configured', () => {
    props.colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
      { color: '#ccc', start: 80, end: 90 },
      { color: '#ccc', start: 90, end: 100 },
    ];
    const component = mountWithIntl(<ColorRanges {...props} />);
    const componentWithMaxSteps = mountWithIntl(
      <ColorRanges {...props} paletteConfiguration={{ maxSteps: 5 }} />
    );
    expect(
      component.find('[data-test-subj="dynamicColoring_addColorRange"]').first().prop('disabled')
    ).toBe(false);

    expect(
      componentWithMaxSteps
        .find('[data-test-subj="dynamicColoring_addColorRange"]')
        .first()
        .prop('disabled')
    ).toBe(true);
  });

  it('should add a new range with default color and reasonable distance from last one', () => {
    let component = mountWithIntl(<ColorRanges {...props} />);
    const addStopButton = component
      .find('[data-test-subj="dynamicColoring_addColorRange"]')
      .first();
    act(() => {
      addStopButton.simulate('click');
    });
    component = component.update();

    expect(component.find('input[data-test-subj^="dynamicColoring_range_value_"]')).toHaveLength(5);
    expect(
      component.find('input[data-test-subj="dynamicColoring_range_value_3"]').prop('value')
    ).toBe(80); // 60-40 + 60
    expect(
      component
        // workaround for https://github.com/elastic/eui/issues/4792
        .find('[data-test-subj="dynamicColoring_range_color_3"]')
        .last() // pick the inner element
        .childAt(0)
        .prop('color')
    ).toBe('#ccc'); // pick previous color
  });

  it('should restore previous color when abandoning the field with an empty color', () => {
    let component = mountWithIntl(<ColorRanges {...props} />);
    expect(
      component
        .find('[data-test-subj="dynamicColoring_range_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('#aaa');
    act(() => {
      component
        .find('[data-test-subj="dynamicColoring_range_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('onChange')!('', {
        rgba: [NaN, NaN, NaN, NaN],
        hex: '',
        isValid: false,
      });
    });
    component = component.update();
    expect(
      component
        .find('[data-test-subj="dynamicColoring_range_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('');
    act(() => {
      component.find('[data-test-subj="dynamicColoring_range_color_0"]').first().simulate('blur');
    });
    component = component.update();
    expect(
      component
        .find('[data-test-subj="dynamicColoring_range_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('#aaa');
  });

  it('should sort ranges value on whole component blur', () => {
    let component = mountWithIntl(<ColorRanges {...props} />);
    let firstValueInput = component.find(
      '[data-test-subj="dynamicColoring_range_value_0"] input[type="number"]'
    );

    act(() => {
      firstValueInput.simulate('change', { target: { value: ' 90' } });
    });
    act(() => {
      component.find('[data-test-subj="dynamicColoring_range_row_0"]').first().simulate('blur');
    });
    component = component.update();

    // retrieve again the input
    firstValueInput = component.find(
      '[data-test-subj="dynamicColoring_range_value_0"] input[type="number"]'
    );
    expect(firstValueInput.prop('value')).toBe(40);
    // the previous one move at the bottom
    expect(
      component
        .find('[data-test-subj="dynamicColoring_range_value_3"] input[type="number"]')
        .prop('value')
    ).toBe(90);
  });

  it('should show current max/min value when user use auto detect min/max value', () => {
    let component = mountWithIntl(<ColorRanges {...props} />);

    let firstValue = component.find(
      '[data-test-subj="dynamicColoring_range_value_0"] input[type="number"]'
    );

    expect(firstValue.prop('value')).toBe(20);

    const addDetectMinValueButton = component
      .find('[data-test-subj="dynamicColoring_autoDetect_minimum"]')
      .first();
    act(() => {
      addDetectMinValueButton.simulate('click');
    });
    component = component.update();
    firstValue = component.find(
      '[data-test-subj="dynamicColoring_range_value_0"] input[type="number"]'
    );

    expect(firstValue.prop('value')).toBe(0);

    let lastValueInput = component.find(
      '[data-test-subj="dynamicColoring_range_value_3"] input[type="number"]'
    );
    expect(lastValueInput.prop('value')).toBe(80);

    const addDetectMaxValueButton = component
      .find('[data-test-subj="dynamicColoring_autoDetect_maximum"]')
      .first();
    act(() => {
      addDetectMaxValueButton.simulate('click');
    });
    component = component.update();
    lastValueInput = component.find(
      '[data-test-subj="dynamicColoring_range_value_3"] input[type="number"]'
    );

    expect(lastValueInput.prop('value')).toBe(200);
  });

  it('should reverse colors when user click "reverse"', () => {
    props.colorRanges = [
      { color: '#aaa', start: 10, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 90 },
      { color: '#ddd', start: 90, end: 130 },
    ];
    let component = mountWithIntl(<ColorRanges {...props} />);

    const reverseColorsButton = component
      .find('[data-test-subj="dynamicColoring_reverseColors"]')
      .first();
    act(() => {
      reverseColorsButton.simulate('click');
    });
    component = component.update();
    const colors: string[] = [];

    const ranges = component.find('div[data-test-subj^="dynamicColoring_range_color_"]');

    ranges.map((range) => {
      if (range.find(EuiColorPicker).length) {
        colors.push(range.find(EuiColorPicker).first().prop('color') as string);
      }
    });

    expect(colors).toStrictEqual(['#ddd', '#ccc', '#bbb', '#aaa']);
  });

  it('should distribute equally ranges when use click on "Distribute equally" button', () => {
    props.colorRanges = [
      { color: '#aaa', start: 10, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 130 },
    ];
    let component = mountWithIntl(<ColorRanges {...props} />);

    let values: number[] = [];

    let ranges = component.find('input[data-test-subj^="dynamicColoring_range_value_"]');
    ranges.map((range) => {
      values.push(range.prop('value') as number);
    });

    expect(values).toStrictEqual([10, 40, 60, 130]);

    const distributeEquallyButton = component
      .find('[data-test-subj="dynamicColoring_distributeEqually"]')
      .first();
    act(() => {
      distributeEquallyButton.simulate('click');
    });
    component = component.update();

    values = [];

    ranges = component.find('input[data-test-subj^="dynamicColoring_range_value_"]');
    ranges.map((range) => {
      values.push(range.prop('value') as number);
    });
    expect(values).toStrictEqual([10, 50, 90, 130]);
  });
});
