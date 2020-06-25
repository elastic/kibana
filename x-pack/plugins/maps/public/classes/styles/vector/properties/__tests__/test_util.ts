/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { FIELD_ORIGIN } from '../../../../../../common/constants';
import { StyleMeta } from '../../style_meta';
import {
  CategoryFieldMeta,
  GeometryTypes,
  RangeFieldMeta,
  StyleMetaDescriptor,
} from '../../../../../../common/descriptor_types';
import { AbstractField, IField } from '../../../../fields/field';
import { IStyle, AbstractStyle } from '../../../style';

class MockField extends AbstractField {
  async getLabel(): Promise<string> {
    return this.getName() + '_label';
  }
  supportsFieldMeta(): boolean {
    return true;
  }
}

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

export const mockField: IField = new MockField({
  fieldName: 'foobar',
  origin: FIELD_ORIGIN.SOURCE,
});

export class MockStyle extends AbstractStyle implements IStyle {
  private readonly _min: number;
  private readonly _max: number;

  constructor({ min = 0, max = 100 } = {}) {
    super(null);
    this._min = min;
    this._max = max;
  }

  getStyleMeta(): StyleMeta {
    const geomTypes: GeometryTypes = {
      isPointsOnly: false,
      isLinesOnly: false,
      isPolygonsOnly: false,
    };
    const rangeFieldMeta: RangeFieldMeta = {
      min: this._min,
      max: this._max,
      delta: this._max - this._min,
    };
    const catFieldMeta: CategoryFieldMeta = {
      categories: [
        {
          key: 'US',
          count: 10,
        },
        {
          key: 'CN',
          count: 8,
        },
      ],
    };

    const styleMetaDescriptor: StyleMetaDescriptor = {
      geometryTypes: geomTypes,
      fieldMeta: {
        foobar: {
          range: rangeFieldMeta,
          categories: catFieldMeta,
        },
      },
    };

    return new StyleMeta(styleMetaDescriptor);
  }
}

export class MockLayer {
  private readonly _style: IStyle;
  constructor(style = new MockStyle()) {
    this._style = style;
  }
  getStyle() {
    return this._style;
  }

  getDataRequest() {
    return null;
  }
}
