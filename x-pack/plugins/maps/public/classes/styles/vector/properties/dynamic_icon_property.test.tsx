/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { RawValue, VECTOR_STYLES } from '../../../../../common/constants';
// @ts-ignore
import { DynamicIconProperty } from './dynamic_icon_property';
import { mockField, MockLayer } from './test_helpers/test_util';
import { IconDynamicOptions } from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer';

const makeProperty = (options: Partial<IconDynamicOptions>, field: IField = mockField) => {
  const defaultOptions: IconDynamicOptions = {
    iconPaletteId: null,
    fieldMetaOptions: { isEnabled: false },
  };
  const mockVectorLayer = new MockLayer() as unknown as IVectorLayer;
  return new DynamicIconProperty(
    { ...defaultOptions, ...options },
    VECTOR_STYLES.ICON,
    field,
    mockVectorLayer,
    () => {
      return (value: RawValue) => value + '_format';
    }
  );
};

describe('getNumberOfCategories', () => {
  test('should derive category number from palettes', async () => {
    const filled = makeProperty({
      iconPaletteId: 'filledShapes',
    });
    expect(filled.getNumberOfCategories()).toEqual(6);
    const hollow = makeProperty({
      iconPaletteId: 'hollowShapes',
    });
    expect(hollow.getNumberOfCategories()).toEqual(5);
  });
});

describe('renderLegendDetailRow', () => {
  test('Should render categorical legend with breaks', async () => {
    const iconStyle = makeProperty({
      iconPaletteId: 'filledShapes',
    });
    const legendRow = iconStyle.renderLegendDetailRow({ isPointsOnly: true, isLinesOnly: false });
    const component = shallow(legendRow);
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('Should render categorical legend with custom icons in breaks', async () => {
    const iconStyle = makeProperty({
      useCustomIconMap: true,
      customIconStops: [
        {
          stop: null,
          value: 'kbn__custom_icon_sdf__foobar',
          svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
        },
        {
          stop: 'MX',
          value: 'marker',
          svg: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n<rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>\n<path d="M5 10V11C5 14.866 8.13401 18 12 18V18V18C15.866 18 19 14.866 19 11V10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>\n<path d="M12 18V22M12 22H9M12 22H15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>\n</svg>\n',
        },
      ],
    });
    const legendRow = iconStyle.renderLegendDetailRow({ isPointsOnly: true, isLinesOnly: false });
    const component = shallow(legendRow);
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });
});

describe('get mapbox icon-image expression (via internal _getMbIconImageExpression)', () => {
  describe('categorical icon palette', () => {
    test('should return mapbox expression for pre-defined icon palette', async () => {
      const iconStyle = makeProperty({
        iconPaletteId: 'filledShapes',
      });
      expect(iconStyle._getMbIconImageExpression()).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'US',
        'circle',
        'CN',
        'marker',
        'square',
      ]);
    });

    test('should return mapbox expression for custom icon palette', async () => {
      const iconStyle = makeProperty({
        useCustomIconMap: true,
        customIconStops: [
          {
            stop: null,
            value: 'circle',
            svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
          },
          {
            stop: 'MX',
            value: 'marker',
            svg: '<svg width="24" height="24" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n<rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>\n<path d="M5 10V11C5 14.866 8.13401 18 12 18V18V18C15.866 18 19 14.866 19 11V10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>\n<path d="M12 18V22M12 22H9M12 22H15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>\n</svg>\n',
          },
        ],
      });
      expect(iconStyle._getMbIconImageExpression()).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'MX',
        'marker',
        'circle',
      ]);
    });
  });
});
