/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CATEGORICAL_DATA_TYPES,
  FIELD_ORIGIN,
  ORDINAL_DATA_TYPES,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { IField } from '../../fields/field';

export interface StyleField {
  label: string;
  name: string;
  origin: FIELD_ORIGIN;
  type: string;
  supportsAutoDomain: boolean;
}

export async function createStyleFieldsHelper(fields: IField[]): Promise<StyleFieldsHelper> {
  const promises: Array<Promise<StyleField>> = fields.map(async (field: IField) => {
    return {
      label: await field.getLabel(),
      name: field.getName(),
      origin: field.getOrigin(),
      type: await field.getDataType(),
      supportsAutoDomain: field.supportsFieldMetaFromLocalData() || field.supportsFieldMetaFromEs(),
    };
  });
  const styleFields = await Promise.all(promises);
  return new StyleFieldsHelper(styleFields);
}

export class StyleFieldsHelper {
  private readonly _styleFields: StyleField[];
  private readonly _ordinalAndCategoricalFields: StyleField[];
  private readonly _numberFields: StyleField[];
  private readonly _ordinalFields: StyleField[];

  constructor(styleFields: StyleField[]) {
    const ordinalAndCategoricalFields: StyleField[] = [];
    const numberFields: StyleField[] = [];
    const ordinalFields: StyleField[] = [];

    styleFields.forEach((styleField: StyleField) => {
      if (
        CATEGORICAL_DATA_TYPES.includes(styleField.type) ||
        ORDINAL_DATA_TYPES.includes(styleField.type)
      ) {
        ordinalAndCategoricalFields.push(styleField);
      }

      if (styleField.type === 'date' || styleField.type === 'number') {
        if (styleField.type === 'number') {
          numberFields.push(styleField);
        }
        if (styleField.supportsAutoDomain) {
          ordinalFields.push(styleField);
        }
      }
    });

    this._styleFields = styleFields;
    this._ordinalAndCategoricalFields = ordinalAndCategoricalFields;
    this._numberFields = numberFields;
    this._ordinalFields = ordinalFields;
  }

  hasFieldForStyle(field: IField, styleName: VECTOR_STYLES): boolean {
    const fieldList = this.getFieldsForStyle(styleName);
    return fieldList.some((styleField) => field.getName() === styleField.name);
  }

  getFieldsForStyle(styleName: VECTOR_STYLES): StyleField[] {
    switch (styleName) {
      case VECTOR_STYLES.ICON_ORIENTATION:
        return this._numberFields;
      case VECTOR_STYLES.FILL_COLOR:
      case VECTOR_STYLES.LINE_COLOR:
      case VECTOR_STYLES.LABEL_COLOR:
      case VECTOR_STYLES.LABEL_BORDER_COLOR:
      case VECTOR_STYLES.ICON:
        return this._ordinalAndCategoricalFields;
      case VECTOR_STYLES.LINE_WIDTH:
      case VECTOR_STYLES.LABEL_SIZE:
      case VECTOR_STYLES.ICON_SIZE:
        return this._ordinalFields;
      case VECTOR_STYLES.LABEL_TEXT:
        return this._styleFields;
      default:
        return [];
    }
  }

  getStyleFields(): StyleField[] {
    return this._styleFields;
  }
}
