/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { getComputedFieldName } from '../styles/vector/style_util';

export interface IField {
  getName(): string;
  getRootName(): string;
  canValueBeFormatted(): boolean;
  getLabel(): Promise<string>;
  getDataType(): Promise<string>;
  createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
  getSource(): IVectorSource;
  getOrigin(): FIELD_ORIGIN;
  isValid(): boolean;
  getOrdinalFieldMetaRequest(): Promise<unknown>;
  getCategoricalFieldMetaRequest(size: number): Promise<unknown>;

  // Determines whether Maps-app can automatically determine the domain of the field-values
  // if this is not the case (e.g. for .mvt tiled data),
  // then styling properties that require the domain to be known cannot use this property.
  supportsAutoDomain(): boolean;

  // Determinse wheter Maps-app can automatically deterime the domain of the field-values
  // _without_ having to retrieve the data as GeoJson
  // e.g. for ES-sources, this would use the extended_stats API
  supportsFieldMeta(): boolean;

  canReadFromGeoJson(): boolean;

  // Returns the name that should be used for accessing the data from the mb-style rule
  // Depending on
  // - whether the field is used for labeling, icon-orientation, or other properties (color, size, ...), `feature-state` and or `get` is used
  // - whether the field was run through a field-formatter, a new dynamic field is created with the formatted-value
  // The combination of both will inform what field-name (e.g. the "raw" field name from the properties, the "computed field-name" for an on-the-fly created property (e.g. for feature-state or field-formatting).
  // todo: There is an existing limitation to .mvt backed sources, where the field-formatters are not applied. Here, the raw-data needs to be accessed.
  getMbPropertyName(styleName: VECTOR_STYLES): string;
}

export class AbstractField implements IField {
  private readonly _fieldName: string;
  private readonly _origin: FIELD_ORIGIN;

  constructor({ fieldName, origin }: { fieldName: string; origin: FIELD_ORIGIN }) {
    this._fieldName = fieldName;
    this._origin = origin || FIELD_ORIGIN.SOURCE;
  }

  getName(): string {
    return this._fieldName;
  }

  getRootName(): string {
    return this.getName();
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  getSource(): IVectorSource {
    throw new Error('must implement Field#getSource');
  }

  isValid(): boolean {
    return !!this._fieldName;
  }

  async getDataType(): Promise<string> {
    return 'string';
  }

  async getLabel(): Promise<string> {
    return this._fieldName;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    const label = await this.getLabel();
    return new TooltipProperty(this.getName(), label, value);
  }

  getOrigin(): FIELD_ORIGIN {
    return this._origin;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return null;
  }

  supportsAutoDomain(): boolean {
    return true;
  }

  canReadFromGeoJson(): boolean {
    return true;
  }

  getMbPropertyName(styleName: VECTOR_STYLES): string {
    return getMbPropertyName(this, styleName);
  }
}

export function getMbPropertyName(field: IField, styleName: VECTOR_STYLES) {
  let targetName;
  if (field.canReadFromGeoJson()) {
    targetName = field.supportsAutoDomain()
      ? getComputedFieldName(styleName, field.getName())
      : field.getName();
  } else {
    targetName = field.getName();
  }
  return targetName;
}
