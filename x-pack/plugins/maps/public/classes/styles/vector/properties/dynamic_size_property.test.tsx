/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

// @ts-ignore
import { DynamicSizeProperty } from './dynamic_size_property';
import { RawValue, VECTOR_STYLES } from '../../../../../common/constants';
import { IField } from '../../../fields/field';
import { Map as MbMap } from 'mapbox-gl';
import { SizeDynamicOptions } from '../../../../../common/descriptor_types';
import { mockField, MockLayer, MockStyle } from './test_helpers/test_util';
import { IVectorLayer } from '../../../layers/vector_layer/vector_layer';

export class MockMbMap {
  _paintPropertyCalls: unknown[];

  constructor() {
    this._paintPropertyCalls = [];
  }
  setPaintProperty(...args: unknown[]) {
    this._paintPropertyCalls.push([...args]);
  }

  getPaintPropertyCalls(): unknown[] {
    return this._paintPropertyCalls;
  }
}

const makeProperty = (
  options: SizeDynamicOptions,
  mockStyle: MockStyle,
  field: IField = mockField
) => {
  return new DynamicSizeProperty(
    options,
    VECTOR_STYLES.ICON_SIZE,
    field,
    (new MockLayer(mockStyle) as unknown) as IVectorLayer,
    () => {
      return (value: RawValue) => value + '_format';
    },
    false
  );
};

const fieldMetaOptions = { isEnabled: true };

describe('renderLegendDetailRow', () => {
  test('Should render as range', async () => {
    const sizeProp = makeProperty(
      { minSize: 0, maxSize: 10, fieldMetaOptions },
      new MockStyle({ min: 0, max: 100 })
    );
    const legendRow = sizeProp.renderLegendDetailRow();
    const component = shallow(legendRow);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });
});

describe('syncSize', () => {
  test('Should sync with circle-radius prop', async () => {
    const sizeProp = makeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions },
      new MockStyle({ min: 0, max: 100 })
    );
    const mockMbMap = (new MockMbMap() as unknown) as MbMap;

    sizeProp.syncCircleRadiusWithMb('foobar', mockMbMap);

    // @ts-expect-error
    expect(mockMbMap.getPaintPropertyCalls()).toEqual([
      [
        'foobar',
        'circle-radius',
        [
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              -1,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 0],
            ],
            0,
          ],
          0,
          8,
          100,
          32,
        ],
      ],
    ]);
  });

  test('Should truncate interpolate expression to max when no delta', async () => {
    const sizeProp = makeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions },
      new MockStyle({ min: 100, max: 100 })
    );
    const mockMbMap = (new MockMbMap() as unknown) as MbMap;

    sizeProp.syncCircleRadiusWithMb('foobar', mockMbMap);

    // @ts-expect-error
    expect(mockMbMap.getPaintPropertyCalls()).toEqual([
      [
        'foobar',
        'circle-radius',
        [
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              99,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 100],
            ],
            0,
          ],
          100,
          32,
        ],
      ],
    ]);
  });
});
