/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../mocks';
import { getFieldByNameFactory } from '../../pure_helpers';
import type { IndexPatternLayer } from '../../types';
import { getInvalidFieldMessage, getErrorsForHistogramField } from './helpers';
import type { TermsIndexPatternColumn } from './terms';

describe('helpers', () => {
  describe('getInvalidFieldMessage', () => {
    it('return an error if a field was removed', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'count',
          sourceField: 'NoBytes', // <= invalid
        },
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field NoBytes was not found');
    });

    it('returns an error if a field is the wrong type', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average',
          sourceField: 'timestamp', // <= invalid type for average
        },
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field timestamp is of the wrong type');
    });

    it('returns an error if one field amongst multiples does not exist', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'geo.src',
          params: {
            secondaryFields: ['NoBytes'], // <= field does not exist
          },
        } as TermsIndexPatternColumn,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field NoBytes was not found');
    });

    it('returns an error if multiple fields do not exist', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'NotExisting',
          params: {
            secondaryFields: ['NoBytes'], // <= field does not exist
          },
        } as TermsIndexPatternColumn,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Fields NotExisting, NoBytes were not found');
    });

    it('returns an error if one field amongst multiples has the wrong type', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'geo.src',
          params: {
            secondaryFields: ['timestamp'], // <= invalid type
          },
        } as TermsIndexPatternColumn,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Field timestamp is of the wrong type');
    });

    it('returns an error if multiple fields are of the wrong type', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'terms',
          sourceField: 'start_date', // <= invalid type
          params: {
            secondaryFields: ['timestamp'], // <= invalid type
          },
        } as TermsIndexPatternColumn,
        createMockedIndexPattern()
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual('Fields start_date, timestamp are of the wrong type');
    });

    it('returns no message if all fields are matching', () => {
      const messages = getInvalidFieldMessage(
        {
          dataType: 'number',
          isBucketed: false,
          label: 'Foo',
          operationType: 'average',
          sourceField: 'bytes',
        },
        createMockedIndexPattern()
      );
      expect(messages).toBeUndefined();
    });
  });

  describe('getErrorsForHistogramField', () => {
    const layer = {
      columns: {
        '731ee6a5-da3d-4b0f-8f37-ffeb539a7980': {
          label: 'Count of records',
          dataType: 'number',
          operationType: 'count',
          isBucketed: false,
          scale: 'ratio',
          sourceField: '___records___',
          params: {
            emptyAsNull: true,
          },
        },
        'd682b1d9-ce53-4443-a1e6-959197a314a6': {
          label: 'my_histogram',
          dataType: 'number',
          operationType: 'range',
          sourceField: 'my_histogram',
          isBucketed: true,
          scale: 'interval',
          params: {
            includeEmptyRows: true,
            type: 'histogram',
            ranges: [
              {
                from: 0,
                to: 1000,
                label: '',
              },
            ],
            maxBars: 'auto',
          },
        },
      },
      columnOrder: ['d682b1d9-ce53-4443-a1e6-959197a314a6', '731ee6a5-da3d-4b0f-8f37-ffeb539a7980'],
      incompleteColumns: {},
      indexPatternId: '1',
    } as IndexPatternLayer;
    const indexPattern = createMockedIndexPattern();
    const updatedIndexPattern = {
      ...indexPattern,
      fields: [
        ...indexPattern.fields,
        {
          name: 'my_histogram',
          displayName: 'my_histogram',
          type: 'histogram',
          aggregatable: true,
          searchable: true,
        },
      ],
      getFieldByName: getFieldByNameFactory([
        {
          name: 'my_histogram',
          type: 'histogram',
          displayName: 'my_histogram',
          searchable: true,
          aggregatable: true,
        },
      ]),
    };

    it('return no error if a count aggregation is given', () => {
      const messages = getErrorsForHistogramField(
        layer,
        'd682b1d9-ce53-4443-a1e6-959197a314a6',
        updatedIndexPattern
      );
      expect(messages).toBeUndefined();
    });

    it('returns an error if a metric is non a count aggregation', () => {
      layer.columns['731ee6a5-da3d-4b0f-8f37-ffeb539a7980'].operationType = 'average';
      const messages = getErrorsForHistogramField(
        layer,
        'd682b1d9-ce53-4443-a1e6-959197a314a6',
        updatedIndexPattern
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual(
        'Histogram fields can only be used with a count aggregation. Please remove the histogram field or change the metric to a count or remove the breakdown dimension.'
      );
    });

    it('returns an error if a metric is a count aggregation and a breakdown is also given', () => {
      layer.columns['731ee6a5-da3d-4b0f-8f37-ffeb539a7980'].operationType = 'count';
      const newLayer = {
        ...layer,
        columns: {
          ...layer.columns,
          'ef5fa77a-b1f7-405e-9551-6b533aafa114': {
            label: 'bytes',
            dataType: 'number',
            operationType: 'range',
            sourceField: 'bytes',
            isBucketed: true,
            scale: 'interval',
            params: {
              includeEmptyRows: true,
              type: 'histogram',
              ranges: [
                {
                  from: 0,
                  to: 1000,
                  label: '',
                },
              ],
              maxBars: 'auto',
            },
          },
        },
        columnOrder: [
          'd682b1d9-ce53-4443-a1e6-959197a314a6',
          '731ee6a5-da3d-4b0f-8f37-ffeb539a7980',
          'ef5fa77a-b1f7-405e-9551-6b533aafa114',
        ],
      } as IndexPatternLayer;
      const messages = getErrorsForHistogramField(
        newLayer,
        'd682b1d9-ce53-4443-a1e6-959197a314a6',
        updatedIndexPattern
      );
      expect(messages).toHaveLength(1);
      expect(messages![0]).toEqual(
        'Histogram fields can only be used with a count aggregation. Please remove the histogram field or change the metric to a count or remove the breakdown dimension.'
      );
    });
  });
});
