/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ColorRanges, ColorRangesProps } from './color_ranges';
import { ReactWrapper } from 'enzyme';
import type { ColorRangesItemProps } from './color_ranges_item';

const colorRangeItemExtractProps = (component: ReactWrapper) => {
  const props = component.props() as ColorRangesItemProps;

  return {
    index: props.index,
    accessor: props.accessor,
    isValid: props.isValid,
    colorRange: props.colorRange,
  };
};

const extraActionSelectors = {
  addColorRange: '[data-test-subj^="lnsPalettePanel_dynamicColoring_addColorRange"]',
  reverseColors: '[data-test-subj^="lnsPalettePanel_dynamicColoring_reverseColors"]',
  distributeEqually: '[data-test-subj="lnsPalettePanel_dynamicColoring_distributeEqually"]',
};

const pageObjects = {
  getAddColorRangeButton: (component: ReactWrapper) =>
    component.find(extraActionSelectors.addColorRange).first(),
  reverseColors: (component: ReactWrapper) =>
    component.find(extraActionSelectors.reverseColors).first(),
  distributeEqually: (component: ReactWrapper) =>
    component.find(extraActionSelectors.distributeEqually).first(),
};

describe('Color Ranges', () => {
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
        continuity: 'none',
      },
      dataBounds: { min: 0, max: 200 },
      onChange: jest.fn(),
    };
  });

  it('should display all the color ranges passed', () => {
    const component = mountWithIntl(<ColorRanges {...props} />);

    expect(component.find('ColorRangeItem')).toHaveLength(4);
  });

  it('should disable "add new" button if there is maxStops configured', () => {
    props.colorRanges = [
      { color: '#aaa', start: 20, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
      { color: '#ccc', start: 80, end: 90 },
      { color: '#ccc', start: 90, end: 100 },
    ];
    const component = mountWithIntl(
      <ColorRanges {...props} paletteConfiguration={{ maxSteps: 5 }} />
    );

    expect(pageObjects.getAddColorRangeButton(component).prop('disabled')).toBe(true);
  });

  it('should add a new range with default color and reasonable distance from last one', () => {
    const component = mountWithIntl(<ColorRanges {...props} />);

    act(() => {
      pageObjects.getAddColorRangeButton(component).simulate('click');
    });

    component.update();

    expect(component.find('ColorRangeItem').map(colorRangeItemExtractProps)).toMatchSnapshot();
  });

  it('should sort ranges value on whole component blur', () => {
    const component = mountWithIntl(<ColorRanges {...props} />);
    const firstInput = component.find('ColorRangeItem').first().find('input').first();

    act(() => {
      firstInput.simulate('change', { target: { value: ' 65' } });
    });

    act(() => {
      firstInput.simulate('blur');
    });

    component.update();

    expect(component.find('ColorRangeItem').map(colorRangeItemExtractProps)).toMatchSnapshot();
  });

  it('should reverse colors when user click "reverse"', () => {
    props.colorRanges = [
      { color: '#aaa', start: 10, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 90 },
      { color: '#ddd', start: 90, end: 130 },
    ];
    const component = mountWithIntl(<ColorRanges {...props} />);

    act(() => {
      pageObjects.reverseColors(component).simulate('click');
    });

    component.update();

    expect(component.find('EuiColorPicker').map((item) => item.prop('color'))).toMatchSnapshot();
  });

  it('should distribute equally ranges when use click on "Distribute equally" button', () => {
    props.colorRanges = [
      { color: '#aaa', start: 0, end: 2 },
      { color: '#bbb', start: 3, end: 4 },
      { color: '#ccc', start: 5, end: 6 },
      { color: '#ccc', start: 7, end: 8 },
    ];

    const component = mountWithIntl(<ColorRanges {...props} />);

    act(() => {
      pageObjects.distributeEqually(component).simulate('click');
    });

    component.update();

    expect(component.find('ColorRangeItem').map(colorRangeItemExtractProps)).toMatchSnapshot();
  });
});
