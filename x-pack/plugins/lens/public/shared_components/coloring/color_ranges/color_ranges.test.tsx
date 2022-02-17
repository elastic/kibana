/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ColorRanges, ColorRangesProps } from './color_ranges';
import { ReactWrapper } from 'enzyme';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { ColorRangesContext } from './color_ranges_context';

const extraActionSelectors = {
  addColor: '[data-test-subj^="lnsPalettePanel_dynamicColoring_addColor"]',
  reverseColors: '[data-test-subj^="lnsPalettePanel_dynamicColoring_reverseColors"]',
  distributeValues: '[data-test-subj="lnsPalettePanel_dynamicColoring_distributeValues"]',
};

const pageObjects = {
  getAddColorRangeButton: (component: ReactWrapper) =>
    component.find(extraActionSelectors.addColor).first(),
  reverseColors: (component: ReactWrapper) =>
    component.find(extraActionSelectors.reverseColors).first(),
  distributeValues: (component: ReactWrapper) =>
    component.find(extraActionSelectors.distributeValues).first(),
};

function renderColorRanges(props: ColorRangesProps) {
  return mountWithIntl(
    <ColorRangesContext.Provider
      value={{
        dataBounds: { min: 0, max: 100 },
        palettes: {} as PaletteRegistry,
      }}
    >
      <ColorRanges {...props} />
    </ColorRangesContext.Provider>
  );
}

describe('Color Ranges', () => {
  let props: ColorRangesProps;
  const dispatch = jest.fn();

  beforeEach(() => {
    dispatch.mockClear();
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
      showExtraActions: true,
      dispatch,
    };
  });

  it('should display all the color ranges passed', () => {
    const component = renderColorRanges(props);

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
    const component = renderColorRanges({ ...props, paletteConfiguration: { maxSteps: 5 } });

    expect(pageObjects.getAddColorRangeButton(component).prop('disabled')).toBe(true);
  });

  it('should add a new range with default color and reasonable distance from last one', () => {
    const component = renderColorRanges(props);

    act(() => {
      pageObjects.getAddColorRangeButton(component).simulate('click');
    });

    component.update();

    expect(dispatch).toHaveBeenCalledWith({
      type: 'addColorRange',
      payload: { dataBounds: { min: 0, max: 100 }, palettes: {} },
    });
  });

  it('should sort ranges value on whole component blur', () => {
    props.colorRanges = [
      { color: '#aaa', start: 65, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 80 },
    ];
    const component = renderColorRanges(props);
    const firstInput = component.find('ColorRangeItem').first().find('input').first();

    act(() => {
      firstInput.simulate('blur');
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'sortColorRanges',
      payload: {
        dataBounds: { min: 0, max: 100 },
        palettes: {},
      },
    });
  });

  it('should reverse colors when user click "reverse"', () => {
    props.colorRanges = [
      { color: '#aaa', start: 10, end: 40 },
      { color: '#bbb', start: 40, end: 60 },
      { color: '#ccc', start: 60, end: 90 },
      { color: '#ddd', start: 90, end: 130 },
    ];
    const component = renderColorRanges(props);

    act(() => {
      pageObjects.reverseColors(component).simulate('click');
    });

    component.update();

    expect(dispatch).toHaveBeenCalledWith({
      type: 'reversePalette',
      payload: {
        dataBounds: { min: 0, max: 100 },
        palettes: {},
      },
    });
  });

  it('should distribute equally ranges when use click on "Distribute values" button', () => {
    props.colorRanges = [
      { color: '#aaa', start: 0, end: 2 },
      { color: '#bbb', start: 3, end: 4 },
      { color: '#ccc', start: 5, end: 6 },
      { color: '#ccc', start: 7, end: 8 },
    ];

    const component = renderColorRanges(props);

    act(() => {
      pageObjects.distributeValues(component).simulate('click');
    });

    component.update();

    expect(dispatch).toHaveBeenCalledWith({
      type: 'distributeEqually',
      payload: { dataBounds: { min: 0, max: 100 }, palettes: {} },
    });
  });
});
