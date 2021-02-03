/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../common/constants';
import { createStyleFieldsHelper, StyleFieldsHelper } from './style_fields_helper';
import { AbstractField, IField } from '../../fields/field';

class MockField extends AbstractField {
  private readonly _dataType: string;
  private readonly _supportsAutoDomain: boolean;
  constructor({ dataType, supportsAutoDomain }: { dataType: string; supportsAutoDomain: boolean }) {
    super({ fieldName: 'foobar_' + dataType, origin: FIELD_ORIGIN.SOURCE });
    this._dataType = dataType;
    this._supportsAutoDomain = supportsAutoDomain;
  }
  async getDataType() {
    return this._dataType;
  }

  supportsAutoDomain(): boolean {
    return this._supportsAutoDomain;
  }
}

describe('StyleFieldHelper', () => {
  describe('isFieldDataTypeCompatibleWithStyleType', () => {
    async function createHelper(
      supportsAutoDomain: boolean
    ): Promise<{
      styleFieldHelper: StyleFieldsHelper;
      stringField: IField;
      numberField: IField;
      dateField: IField;
    }> {
      const stringField = new MockField({
        dataType: 'string',
        supportsAutoDomain,
      });
      const numberField = new MockField({
        dataType: 'number',
        supportsAutoDomain,
      });
      const dateField = new MockField({
        dataType: 'date',
        supportsAutoDomain,
      });
      return {
        styleFieldHelper: await createStyleFieldsHelper([stringField, numberField, dateField]),
        stringField,
        numberField,
        dateField,
      };
    }

    test('Should validate colors for all data types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [
        VECTOR_STYLES.FILL_COLOR,
        VECTOR_STYLES.LINE_COLOR,
        VECTOR_STYLES.LABEL_COLOR,
        VECTOR_STYLES.LABEL_BORDER_COLOR,
      ].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(true);
      });
    });

    test('Should validate sizes for all number types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.LINE_WIDTH, VECTOR_STYLES.LABEL_SIZE, VECTOR_STYLES.ICON_SIZE].forEach(
        (styleType) => {
          expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
          expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(true);
        }
      );
    });

    test('Should not validate sizes if autodomain is not enabled', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(false);

      [VECTOR_STYLES.LINE_WIDTH, VECTOR_STYLES.LABEL_SIZE, VECTOR_STYLES.ICON_SIZE].forEach(
        (styleType) => {
          expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
        }
      );
    });

    test('Should validate orientation only number types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.ICON_ORIENTATION].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
      });
    });

    test('Should not validate label_border_size', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.LABEL_BORDER_SIZE].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
      });
    });
  });
});
