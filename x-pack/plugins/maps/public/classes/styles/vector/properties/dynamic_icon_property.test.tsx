/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { shallow } from 'enzyme';

jest.mock('ui/new_platform');
jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { VECTOR_STYLES } from '../../../../../common/constants';
// @ts-ignore
import { DynamicIconProperty } from './dynamic_icon_property';
import { mockField, MockLayer } from './__tests__/test_util';
import { IconDynamicOptions } from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';

const makeProperty = (options: Partial<IconDynamicOptions>, field: IField = mockField) => {
  return new DynamicIconProperty(
    { ...options, fieldMetaOptions: { isEnabled: false } },
    VECTOR_STYLES.ICON,
    field,
    new MockLayer(),
    () => {
      return (x: string) => x + '_format';
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
      expect(iconStyle._getMbIconImageExpression(15)).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'US',
        'circle-15',
        'CN',
        'marker-15',
        'square-15',
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
      expect(iconStyle._getMbIconImageExpression(15)).toEqual([
        'match',
        ['to-string', ['get', 'foobar']],
        'MX',
        'marker-15',
        'circle-15',
      ]);
    });
  });
});
