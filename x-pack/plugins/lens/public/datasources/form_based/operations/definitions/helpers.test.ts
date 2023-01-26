/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../mocks';
import type { FormBasedLayer } from '../../types';
import type { GenericIndexPatternColumn } from './column_types';
import { getInvalidFieldMessage } from './helpers';
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
      expect(messages![0]).toEqual({
        displayLocations: [
          { id: 'toolbar' },
          { id: 'dimensionButton', dimensionId: columnId },
          { id: 'embeddableBadge' },
        ],
        message: 'Field NoBytes was not found',
      });
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
      expect(messages![0]).toEqual({
        displayLocations: [
          { id: 'toolbar' },
          { id: 'dimensionButton', dimensionId: columnId },
          { id: 'embeddableBadge' },
        ],
        message: 'Field NoBytes was not found',
      });
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
      expect(messages![0]).toEqual({
        displayLocations: [
          { id: 'toolbar' },
          { id: 'dimensionButton', dimensionId: columnId },
          { id: 'embeddableBadge' },
        ],
        message: 'Fields NotExisting, NoBytes were not found',
      });
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
});
