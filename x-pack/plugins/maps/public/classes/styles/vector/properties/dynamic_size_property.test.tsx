/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');
jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

// @ts-ignore
import { DynamicSizeProperty } from './dynamic_size_property';
import { VECTOR_STYLES } from '../../../../../common/constants';
import { IField } from '../../../fields/field';
import { MockMbMap } from './__tests__/test_util';

import { mockField, MockLayer, MockStyle } from './__tests__/test_util';

const makeProperty = (options: object, mockStyle: MockStyle, field: IField = mockField) => {
  return new DynamicSizeProperty(
    options,
    VECTOR_STYLES.ICON_SIZE,
    field,
    new MockLayer(mockStyle),
    () => {
      return (x: string) => x + '_format';
    }
  );
};

const defaultLegendParams = {
  isPointsOnly: true,
  isLinesOnly: false,
};

describe('renderLegendDetailRow', () => {
  test('Should render as range', async () => {
    const sizeProp = makeProperty({}, new MockStyle({ min: 0, max: 100 }));
    const legendRow = sizeProp.renderLegendDetailRow(defaultLegendParams);
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
    const sizeProp = makeProperty({ minSize: 8, maxSize: 32 }, new MockStyle({ min: 0, max: 100 }));
    const mockMbMap = new MockMbMap();

    sizeProp.syncCircleRadiusWithMb('foobar', mockMbMap);

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
      { minSize: 8, maxSize: 32 },
      new MockStyle({ min: 100, max: 100 })
    );
    const mockMbMap = new MockMbMap();

    sizeProp.syncCircleRadiusWithMb('foobar', mockMbMap);

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
