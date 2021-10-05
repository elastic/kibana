/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPicker } from '@elastic/eui';
import { mount } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { CustomStops, CustomStopsProps } from './color_stops';

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

describe('Color Stops component', () => {
  let props: CustomStopsProps;
  beforeEach(() => {
    props = {
      colorStops: [
        { color: '#aaa', stop: 20 },
        { color: '#bbb', stop: 40 },
        { color: '#ccc', stop: 60 },
      ],
      paletteConfiguration: {},
      dataBounds: { min: 0, max: 200 },
      onChange: jest.fn(),
      'data-test-prefix': 'my-test',
    };
  });
  it('should display all the color stops passed', () => {
    const component = mount(<CustomStops {...props} />);
    expect(
      component.find('input[data-test-subj^="my-test_dynamicColoring_stop_value_"]')
    ).toHaveLength(3);
  });

  it('should disable the delete buttons when there are 2 stops or less', () => {
    // reduce to 2 stops
    props.colorStops = props.colorStops.slice(0, 2);
    const component = mount(<CustomStops {...props} />);
    expect(
      component
        .find('[data-test-subj="my-test_dynamicColoring_removeStop_0"]')
        .first()
        .prop('isDisabled')
    ).toBe(true);
  });

  it('should add a new stop with default color and reasonable distance from last one', () => {
    let component = mount(<CustomStops {...props} />);
    const addStopButton = component
      .find('[data-test-subj="my-test_dynamicColoring_addStop"]')
      .first();
    act(() => {
      addStopButton.simulate('click');
    });
    component = component.update();

    expect(
      component.find('input[data-test-subj^="my-test_dynamicColoring_stop_value_"]')
    ).toHaveLength(4);
    expect(
      component.find('input[data-test-subj="my-test_dynamicColoring_stop_value_3"]').prop('value')
    ).toBe('80'); // 60-40 + 60
    expect(
      component
        // workaround for https://github.com/elastic/eui/issues/4792
        .find('[data-test-subj="my-test_dynamicColoring_stop_color_3"]')
        .last() // pick the inner element
        .childAt(0)
        .prop('color')
    ).toBe('#ccc'); // pick previous color
  });

  it('should restore previous color when abandoning the field with an empty color', () => {
    let component = mount(<CustomStops {...props} />);
    expect(
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('#aaa');
    act(() => {
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_row_0"]')
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
        .find('[data-test-subj="my-test_dynamicColoring_stop_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('');
    act(() => {
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_color_0"]')
        .first()
        .simulate('blur');
    });
    component = component.update();
    expect(
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_row_0"]')
        .first()
        .find(EuiColorPicker)
        .first()
        .prop('color')
    ).toBe('#aaa');
  });

  it('should sort stops value on whole component blur', () => {
    let component = mount(<CustomStops {...props} />);
    let firstStopValueInput = component.find(
      '[data-test-subj="my-test_dynamicColoring_stop_value_0"] input[type="number"]'
    );

    act(() => {
      firstStopValueInput.simulate('change', { target: { value: ' 90' } });
    });
    act(() => {
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_row_0"]')
        .first()
        .simulate('blur');
    });
    component = component.update();

    // retrieve again the input
    firstStopValueInput = component.find(
      '[data-test-subj="my-test_dynamicColoring_stop_value_0"] input[type="number"]'
    );
    expect(firstStopValueInput.prop('value')).toBe('40');
    // the previous one move at the bottom
    expect(
      component
        .find('[data-test-subj="my-test_dynamicColoring_stop_value_2"] input[type="number"]')
        .prop('value')
    ).toBe('90');
  });
});
