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
import { IField } from '../../../../fields/field';
import { AbstractVectorSource, IVectorSource } from '../../../../sources/vector_source';
import { ITooltipProperty, TooltipProperty } from '../../../../tooltips/tooltip_property';

export const mockField: IField = {
  canValueBeFormatted(): boolean {
    return true;
  },
  async createTooltipProperty(value: string | undefined): Promise<ITooltipProperty> {
    return new TooltipProperty('foobar', 'foobar', 'foo bar value');
  },
  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return undefined;
  },
  async getDataType(): Promise<string> {
    return 'string';
  },
  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return null;
  },
  getSource(): IVectorSource {
    return new AbstractVectorSource({ type: 'TEST' });
  },
  isValid(): boolean {
    return false;
  },
  async getLabel(): Promise<string> {
    return 'foobar_label';
  },
  getName(): string {
    return 'foobar';
  },
  getRootName(): string {
    return 'foobar';
  },
  getOrigin(): FIELD_ORIGIN {
    return FIELD_ORIGIN.SOURCE;
  },
  supportsFieldMeta(): boolean {
    return true;
  },
};

class MockStyle {
  getStyleMeta(): StyleMeta {
    const geomTypes: GeometryTypes = {
      isPointsOnly: false,
      isLinesOnly: false,
      isPolygonsOnly: false,
    };
    const rangeFieldMeta: RangeFieldMeta = { min: 0, max: 100, delta: 100 };
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
  getStyle() {
    return new MockStyle();
  }

  getDataRequest() {
    return null;
  }
}
