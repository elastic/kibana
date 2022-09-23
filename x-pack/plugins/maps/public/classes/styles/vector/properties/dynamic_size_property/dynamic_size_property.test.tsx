/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { DynamicSizeProperty } from './dynamic_size_property';
import { FIELD_ORIGIN, RawValue, VECTOR_STYLES } from '../../../../../../common/constants';
import { IField } from '../../../../fields/field';
import { IVectorLayer } from '../../../../layers/vector_layer';

describe('renderLegendDetailRow', () => {
  test('Should render line width simple range', async () => {
    const field = {
      getLabel: async () => {
        return 'foobar_label';
      },
      getName: () => {
        return 'foodbar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
      supportsFieldMetaFromLocalData: () => {
        return true;
      },
    } as unknown as IField;
    const sizeProp = new DynamicSizeProperty(
      { minSize: 0, maxSize: 10, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.LINE_WIDTH,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    sizeProp.getRangeFieldMeta = () => {
      return {
        min: 0,
        max: 100,
        delta: 100,
      };
    };

    const legendRow = sizeProp.renderLegendDetailRow();
    const component = shallow(legendRow);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('Should render icon size scale', async () => {
    const field = {
      getLabel: async () => {
        return 'foobar_label';
      },
      getName: () => {
        return 'foodbar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
      supportsFieldMetaFromLocalData: () => {
        return true;
      },
    } as unknown as IField;
    const sizeProp = new DynamicSizeProperty(
      { minSize: 0, maxSize: 10, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.ICON_SIZE,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    sizeProp.getRangeFieldMeta = () => {
      return {
        min: 0,
        max: 100,
        delta: 100,
      };
    };

    const legendRow = sizeProp.renderLegendDetailRow();
    const component = shallow(legendRow);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });
});

describe('getMbSizeExpression', () => {
  test('Should return interpolation expression with single stop when range.delta is 0', async () => {
    const field = {
      isValid: () => {
        return true;
      },
      getName: () => {
        return 'foobar';
      },
      getMbFieldName: () => {
        return 'foobar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      getSource: () => {
        return {
          isMvt: () => {
            return false;
          },
        };
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
    } as unknown as IField;
    const sizeProp = new DynamicSizeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.ICON_SIZE,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    sizeProp.getRangeFieldMeta = () => {
      return {
        min: 100,
        max: 100,
        delta: 0,
      };
    };

    expect(sizeProp.getMbSizeExpression()).toEqual([
      'interpolate',
      ['linear'],
      [
        'sqrt',
        [
          'coalesce',
          [
            'case',
            ['==', ['feature-state', 'foobar'], null],
            100,
            ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 100],
          ],
          100,
        ],
      ],
      10,
      32,
    ]);
  });
});
