/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StyleMetaDescriptor, RangeFieldMeta, Category } from '../../../../common/descriptor_types';

export class StyleMeta {
  private readonly _descriptor: StyleMetaDescriptor;
  constructor(styleMetaDescriptor: StyleMetaDescriptor | null | undefined) {
    this._descriptor = styleMetaDescriptor ? styleMetaDescriptor : { fieldMeta: {} };
  }

  getRangeFieldMetaDescriptor(fieldName: string): RangeFieldMeta | null {
    return this._descriptor.fieldMeta[fieldName] && this._descriptor.fieldMeta[fieldName].range
      ? this._descriptor.fieldMeta[fieldName].range!
      : null;
  }

  getCategoryFieldMetaDescriptor(fieldName: string): Category[] {
    return this._descriptor.fieldMeta[fieldName]
      ? this._descriptor.fieldMeta[fieldName].categories
      : [];
  }

  isPointsOnly(): boolean {
    return this._descriptor.geometryTypes ? !!this._descriptor.geometryTypes.isPointsOnly : false;
  }

  isLinesOnly(): boolean {
    return this._descriptor.geometryTypes ? !!this._descriptor.geometryTypes.isLinesOnly : false;
  }

  isPolygonsOnly(): boolean {
    return this._descriptor.geometryTypes ? !!this._descriptor.geometryTypes.isPolygonsOnly : false;
  }
}
