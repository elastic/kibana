/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@kbn/tinymath';
import { monaco } from '@kbn/monaco';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createMockedIndexPattern } from '../../../../mocks';
import { GenericOperationDefinition } from '../..';
import type { OperationMetadata, IndexPatternField } from '../../../../../../types';
import { tinymathFunctions } from '../util';
import {
  getSignatureHelp,
  getHover,
  suggest,
  monacoPositionToOffset,
  offsetToRowColumn,
  getInfoAtZeroIndexedPosition,
} from './math_completion';
import { createOperationDefinitionMock } from '../mocks/operation_mocks';

const buildGenericColumn = <T extends 'field' | 'fullReference' = 'field'>(type: string) => {
  return (({ field }: { field?: IndexPatternField }) => {
    return {
      label: type,
      dataType: 'number',
      operationType: type,
      sourceField: field?.name ?? undefined,
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
    };
  }) as unknown as Extract<GenericOperationDefinition, { input: T }>['buildColumn'];
};

// Mind the OperationMetadata shape here, it is very important for the field suggestions;
// internally they are serialized and compared as strings
const numericOperation = (): OperationMetadata => ({ dataType: 'number', isBucketed: false });
const stringOperation = (): OperationMetadata => ({ dataType: 'string', isBucketed: true });

// Only one of each type is needed
const operationDefinitionMap: Record<string, GenericOperationDefinition> = {
  sum: createOperationDefinitionMock('sum', {
    getPossibleOperationForField: jest.fn((field: IndexPatternField) =>
      field.type === 'number' ? numericOperation() : undefined
    ),
    documentation: {
      section: 'elasticsearch',
      signature: 'field: string',
      description: 'description',
    },
  }),
  count: createOperationDefinitionMock('count', {
    getPossibleOperationForField: (field: IndexPatternField) =>
      field.name === '___records___' ? numericOperation() : undefined,
  }),
  last_value: createOperationDefinitionMock('last_value', {
    buildColumn: buildGenericColumn('last_value'),
    getPossibleOperationForField: (field: IndexPatternField) =>
      ({
        dataType: field.type,
        isBucketed: false,
      } as OperationMetadata),
  }),
  moving_average: createOperationDefinitionMock('moving_average', {
    input: 'fullReference',
    requiredReferences: [
      {
        input: ['field', 'managedReference'],
        validateMetadata: (meta: OperationMetadata) =>
          meta.dataType === 'number' && !meta.isBucketed,
      },
    ],
    operationParams: [{ name: 'window', type: 'number', required: true }],
    buildColumn: buildGenericColumn<'fullReference'>('moving_average'),
  }),
  cumulative_sum: createOperationDefinitionMock('cumulative_sum', {
    input: 'fullReference',
    buildColumn: buildGenericColumn<'fullReference'>('cumulative_sum'),
  }),
  terms: createOperationDefinitionMock(
    'terms',
    {
      getPossibleOperationForField: stringOperation,
    },
    {
      scale: 'ordinal',
    }
  ),
};

describe('math completion', () => {
  describe('signature help', () => {
    function unwrapSignatures(signatureResult: monaco.languages.SignatureHelpResult) {
      return signatureResult.value.signatures[0];
    }

    it('should silently handle parse errors', () => {
      expect(unwrapSignatures(getSignatureHelp('sum(', 4, operationDefinitionMap))).toBeUndefined();
    });

    it('should return a signature for a field-based ES function', () => {
      expect(unwrapSignatures(getSignatureHelp('sum()', 4, operationDefinitionMap))).toEqual({
        label: 'sum(field: string)',
        documentation: { value: 'description' },
        parameters: [{ label: 'field' }],
      });
    });

    it('should return a signature for count', () => {
      expect(unwrapSignatures(getSignatureHelp('count()', 6, operationDefinitionMap))).toEqual({
        label: 'count(undefined)',
        documentation: { value: '' },
        parameters: [],
      });
    });

    it('should return a signature for a function with named parameters', () => {
      expect(
        unwrapSignatures(
          getSignatureHelp('2 * moving_average(count(), window=)', 35, operationDefinitionMap)
        )
      ).toEqual({
        label: expect.stringContaining('moving_average('),
        documentation: { value: '' },
        parameters: [
          { label: 'function' },
          {
            label: 'window=number',
            documentation: 'Required',
          },
        ],
      });
    });

    it('should return a signature for an inner function', () => {
      expect(
        unwrapSignatures(
          getSignatureHelp('2 * moving_average(count())', 25, operationDefinitionMap)
        )
      ).toEqual({
        label: expect.stringContaining('count('),
        parameters: [],
        documentation: { value: '' },
      });
    });

    it('should return a signature for a complex tinymath function', () => {
      // 15 is the whitespace between the two arguments
      expect(
        unwrapSignatures(getSignatureHelp('clamp(count(), 5)', 15, operationDefinitionMap))
      ).toEqual({
        label: expect.stringContaining('clamp('),
        documentation: { value: '' },
        parameters: [
          { label: 'value', documentation: '' },
          { label: 'min', documentation: '' },
          { label: 'max', documentation: '' },
        ],
      });
    });
  });

  describe('hover provider', () => {
    it('should silently handle parse errors', () => {
      expect(getHover('sum(', 2, operationDefinitionMap)).toEqual({ contents: [] });
    });

    it('should show signature for a field-based ES function', () => {
      expect(getHover('sum()', 2, operationDefinitionMap)).toEqual({
        contents: [{ value: 'sum(field: string)' }],
      });
    });

    it('should show signature for count', () => {
      expect(getHover('count()', 2, operationDefinitionMap)).toEqual({
        contents: [{ value: expect.stringContaining('count(') }],
      });
    });

    it('should show signature for a function with named parameters', () => {
      expect(getHover('2 * moving_average(count())', 10, operationDefinitionMap)).toEqual({
        contents: [{ value: expect.stringContaining('moving_average(') }],
      });
    });

    it('should show signature for an inner function', () => {
      expect(getHover('2 * moving_average(count())', 22, operationDefinitionMap)).toEqual({
        contents: [{ value: expect.stringContaining('count(') }],
      });
    });

    it('should show signature for a complex tinymath function', () => {
      expect(getHover('clamp(count(), 5)', 2, operationDefinitionMap)).toEqual({
        contents: [{ value: expect.stringContaining('clamp([value]: number') }],
      });
    });
  });

  describe('autocomplete', () => {
    const dateRange = { fromDate: '2022-11-01T00:00:00.000Z', toDate: '2022-11-03T00:00:00.000Z' };

    function getSuggestionArgs({
      expression,
      zeroIndexedOffset,
      triggerCharacter,
    }: {
      expression: string;
      zeroIndexedOffset: number;
      triggerCharacter: string;
    }) {
      return {
        expression,
        zeroIndexedOffset,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter,
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        unifiedSearch: unifiedSearchPluginMock.createStartContract(),
        dataViews: dataViewPluginMocks.createStartContract(),
        dateRange,
      };
    }
    it('should list all valid functions at the top level (fake test)', async () => {
      // This test forces an invalid scenario, since the autocomplete actually requires
      // some typing
      const results = await suggest(
        getSuggestionArgs({
          expression: '',
          zeroIndexedOffset: 1,
          triggerCharacter: '',
        })
      );
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
    });

    it('should list all valid sub-functions for a fullReference', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'moving_average()',
          zeroIndexedOffset: 15,
          triggerCharacter: '(',
        })
      );
      expect(results.list).toHaveLength(2);
      ['sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
    });

    it('should list all valid named arguments for a fullReference', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'moving_average(count(),)',
          zeroIndexedOffset: 23,
          triggerCharacter: ',',
        })
      );
      expect(results.list).toEqual(['window']);
    });

    it('should not list named arguments when they are already in use', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'moving_average(count(), window=5, )',
          zeroIndexedOffset: 34,
          triggerCharacter: ',',
        })
      );
      expect(results.list).toEqual([]);
    });

    it('should list all valid positional arguments for a tinymath function used by name', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'divide(count(), )',
          zeroIndexedOffset: 16,
          triggerCharacter: ',',
        })
      );
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
    });

    it('should list all valid positional arguments for a tinymath function used with alias', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'count() / ',
          zeroIndexedOffset: 10,
          triggerCharacter: ',',
        })
      );
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
    });

    it('should not autocomplete any fields for the count function', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'count()',
          zeroIndexedOffset: 6,
          triggerCharacter: '(',
        })
      );
      expect(results.list).toHaveLength(0);
    });

    it('should autocomplete and validate the right type of field', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'sum()',
          zeroIndexedOffset: 4,
          triggerCharacter: '(',
        })
      );
      expect(results.list).toEqual(['bytes', 'memory']);
    });

    it('should autocomplete only operations that provide numeric or date output', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: 'last_value()',
          zeroIndexedOffset: 11,
          triggerCharacter: '(',
        })
      );
      expect(results.list).toEqual(['bytes', 'memory', 'timestamp', 'start_date']);
    });

    it('should autocomplete shift parameter with relative suggestions and a couple of abs ones', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: `count(shift='')`,
          zeroIndexedOffset: 13,
          triggerCharacter: '=',
        })
      );
      expect(results.list).toEqual([
        '',
        '1h',
        '3h',
        '6h',
        '12h',
        '1d',
        '1w',
        '1M',
        '3M',
        '6M',
        '1y',
        'previous',
        'startAt(2022-11-01T00:00:00.000Z)',
        'endAt(2022-11-03T00:00:00.000Z)',
      ]);
    });

    it('should autocomplete shift parameter with absolute suggestions once detected', async () => {
      const results = await suggest(
        getSuggestionArgs({
          expression: `count(shift='endAt(')`,
          zeroIndexedOffset: 19,
          triggerCharacter: '=',
        })
      );
      expect(results.list).toEqual([
        '2022-11-03T00:00:00.000Z)',
        '2022-11-02T23:00:00.000Z)',
        '2022-11-02T21:00:00.000Z)',
        '2022-11-02T18:00:00.000Z)',
        '2022-11-02T12:00:00.000Z)',
        '2022-11-02T00:00:00.000Z)',
        '2022-10-27T00:00:00.000Z)',
        '2022-10-03T00:00:00.000Z)',
        '2022-08-03T00:00:00.000Z)',
        '2022-05-03T00:00:00.000Z)',
        '2021-11-03T00:00:00.000Z)',
        '2022-11-03T00:00:00.000Z)',
      ]);
    });
  });

  describe('offsetToRowColumn', () => {
    it('should work with single-line strings', () => {
      const input = `0123456`;
      expect(offsetToRowColumn(input, 5)).toEqual(
        expect.objectContaining({
          lineNumber: 1,
          column: 6,
        })
      );
    });

    it('should work with multi-line strings accounting for newline characters', () => {
      const input = `012
456
89')`;
      expect(offsetToRowColumn(input, 0)).toEqual(
        expect.objectContaining({
          lineNumber: 1,
          column: 1,
        })
      );
      expect(offsetToRowColumn(input, 9)).toEqual(
        expect.objectContaining({
          lineNumber: 3,
          column: 2,
        })
      );
    });
  });

  describe('monacoPositionToOffset', () => {
    it('should work with multi-line strings accounting for newline characters', () => {
      const input = `012
456
89')`;
      expect(input[monacoPositionToOffset(input, new monaco.Position(1, 1))]).toEqual('0');
      expect(input[monacoPositionToOffset(input, new monaco.Position(3, 2))]).toEqual('9');
    });
  });

  describe('getInfoAtZeroIndexedPosition', () => {
    it('should return the location for a function inside multiple levels of math', () => {
      const expression = `count() + 5 + average(LENS_MATH_MARKER)`;
      const ast = parse(expression);
      expect(getInfoAtZeroIndexedPosition(ast, 22)).toEqual({
        ast: expect.objectContaining({ value: 'LENS_MATH_MARKER' }),
        parent: expect.objectContaining({ name: 'average' }),
      });
    });
  });
});
