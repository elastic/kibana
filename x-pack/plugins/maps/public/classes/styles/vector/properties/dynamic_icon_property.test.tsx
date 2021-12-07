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
          { stop: null, icon: 'circle' },
          { stop: 'MX', icon: 'marker' },
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
