/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../mocks';
import type { FormBasedLayer } from '../../types';
import type { GenericIndexPatternColumn } from './column_types';
import { getInvalidFieldMessage, isValidNumber } from './helpers';
import type { TermsIndexPatternColumn } from './terms';

describe('helpers', () => {
  const columnId = 'column_id';
  const getLayerWithColumn = (column: GenericIndexPatternColumn) =>
    ({
      columnOrder: [columnId],
      indexPatternId: '',
      columns: {
        [columnId]: column,
      },
    } as FormBasedLayer);

  describe('getInvalidFieldMessage', () => {
    it('return an error if a field was removed', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'count',
          sourceField: 'NoBytes', // <= invalid
        }),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toMatchInlineSnapshot(`
        Object {
          "displayLocations": Array [
            Object {
              "id": "toolbar",
            },
            Object {
              "dimensionId": "column_id",
              "id": "dimensionButton",
            },
            Object {
              "id": "embeddableBadge",
            },
          ],
          "message": <FormattedMessage
            defaultMessage="{count, plural, one {Field} other {Fields}} {missingFields} {count, plural, one {was} other {were}} not found."
            id="xpack.lens.indexPattern.fieldsNotFound"
            values={
              Object {
                "count": 1,
                "missingFields": <React.Fragment>
                  <React.Fragment>
                    <strong>
                      NoBytes
                    </strong>
                    
                  </React.Fragment>
                </React.Fragment>,
              }
            }
          />,
        }
      `);
    });

    it('returns an error if a field is the wrong type', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average',
          sourceField: 'timestamp', // <= invalid type for average
        }),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field timestamp is of the wrong type');
    });

    it('returns an error if one field amongst multiples does not exist', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'geo.src',
          params: {
            secondaryFields: ['NoBytes'], // <= field does not exist
          },
        } as TermsIndexPatternColumn),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toMatchInlineSnapshot(`
        Object {
          "displayLocations": Array [
            Object {
              "id": "toolbar",
            },
            Object {
              "dimensionId": "column_id",
              "id": "dimensionButton",
            },
            Object {
              "id": "embeddableBadge",
            },
          ],
          "message": <FormattedMessage
            defaultMessage="{count, plural, one {Field} other {Fields}} {missingFields} {count, plural, one {was} other {were}} not found."
            id="xpack.lens.indexPattern.fieldsNotFound"
            values={
              Object {
                "count": 1,
                "missingFields": <React.Fragment>
                  <React.Fragment>
                    <strong>
                      NoBytes
                    </strong>
                    
                  </React.Fragment>
                </React.Fragment>,
              }
            }
          />,
        }
      `);
    });

    it('returns an error if multiple fields do not exist', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'NotExisting',
          params: {
            secondaryFields: ['NoBytes'], // <= field does not exist
          },
        } as TermsIndexPatternColumn),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toMatchInlineSnapshot(`
        Object {
          "displayLocations": Array [
            Object {
              "id": "toolbar",
            },
            Object {
              "dimensionId": "column_id",
              "id": "dimensionButton",
            },
            Object {
              "id": "embeddableBadge",
            },
          ],
          "message": <FormattedMessage
            defaultMessage="{count, plural, one {Field} other {Fields}} {missingFields} {count, plural, one {was} other {were}} not found."
            id="xpack.lens.indexPattern.fieldsNotFound"
            values={
              Object {
                "count": 2,
                "missingFields": <React.Fragment>
                  <React.Fragment>
                    <strong>
                      NotExisting
                    </strong>
                    , 
                  </React.Fragment>
                  <React.Fragment>
                    <strong>
                      NoBytes
                    </strong>
                    
                  </React.Fragment>
                </React.Fragment>,
              }
            }
          />,
        }
      `);
    });

    it('returns an error if one field amongst multiples has the wrong type', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'geo.src',
          params: {
            secondaryFields: ['timestamp'], // <= invalid type
          },
        } as TermsIndexPatternColumn),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field timestamp is of the wrong type');
    });

    it('returns an error if multiple fields are of the wrong type', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'start_date', // <= invalid type
          params: {
            secondaryFields: ['timestamp'], // <= invalid type
          },
        } as TermsIndexPatternColumn),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Fields start_date, timestamp are of the wrong type');
    });

    it('returns no message if all fields are matching', () => {
      const messages = getInvalidFieldMessage(
        getLayerWithColumn({
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average',
          sourceField: 'bytes',
        }),
        columnId,
        createMockedIndexPattern()
      );
      expect(messages).toBeUndefined();
    });
  });

  describe('isValidNumber', () => {
    it('should work for integers', () => {
      const number = 99;
      for (const value of [number, `${number}`]) {
        expect(isValidNumber(value)).toBeTruthy();
        expect(isValidNumber(value, true)).toBeTruthy();
        expect(isValidNumber(value, false)).toBeTruthy();
        expect(isValidNumber(value, true, number, 1)).toBeTruthy();
        expect(isValidNumber(value, true, number + 1, number)).toBeTruthy();
        expect(isValidNumber(value, false, number, 1)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
        expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
      }
    });

    it('should work correctly for numeric falsy values', () => {
      expect(isValidNumber(0)).toBeTruthy();
      expect(isValidNumber(0, true)).toBeTruthy();
      expect(isValidNumber(0, false)).toBeTruthy();
      expect(isValidNumber(0, true, 1, 0)).toBeTruthy();
    });

    it('should work for decimals', () => {
      const number = 99.9;
      for (const value of [number, `${number}`]) {
        expect(isValidNumber(value)).toBeTruthy();
        expect(isValidNumber(value, true)).toBeFalsy();
        expect(isValidNumber(value, false)).toBeTruthy();
        expect(isValidNumber(value, true, number, 1)).toBeFalsy();
        expect(isValidNumber(value, true, number + 1, number)).toBeFalsy();
        expect(isValidNumber(value, false, number, 1)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number, 0)).toBeFalsy();
        expect(isValidNumber(value, false, number + 1, number, 1)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
        expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
      }
    });

    it('should work for negative values', () => {
      const number = -10.1;
      for (const value of [number, `${number}`]) {
        expect(isValidNumber(value)).toBeTruthy();
        expect(isValidNumber(value, true)).toBeFalsy();
        expect(isValidNumber(value, false)).toBeTruthy();
        expect(isValidNumber(value, true, number, -20)).toBeFalsy();
        expect(isValidNumber(value, true, number + 1, number)).toBeFalsy();
        expect(isValidNumber(value, false, number, -20)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number, 0)).toBeFalsy();
        expect(isValidNumber(value, false, number + 1, number, 1)).toBeTruthy();
        expect(isValidNumber(value, false, number + 1, number, 2)).toBeTruthy();
        expect(isValidNumber(value, false, number - 1, number - 2)).toBeFalsy();
      }
    });

    it('should spot invalid values', () => {
      for (const value of [NaN, ``, undefined, null, Infinity, -Infinity]) {
        expect(isValidNumber(value)).toBeFalsy();
        expect(isValidNumber(value, true)).toBeFalsy();
        expect(isValidNumber(value, false)).toBeFalsy();
        expect(isValidNumber(value, true, 99, 1)).toBeFalsy();
        expect(isValidNumber(value, true, 99, 1)).toBeFalsy();
        expect(isValidNumber(value, false, 99, 1)).toBeFalsy();
        expect(isValidNumber(value, false, 99, 1)).toBeFalsy();
        expect(isValidNumber(value, false, 99, 1, 0)).toBeFalsy();
        expect(isValidNumber(value, false, 99, 1, 1)).toBeFalsy();
        expect(isValidNumber(value, false, 99, 1, 2)).toBeFalsy();
      }
    });
  });
});
