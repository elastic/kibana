/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@kbn/tinymath';
import { monaco } from '@kbn/monaco';
import { createMockedIndexPattern } from '../../../../mocks';
import { GenericOperationDefinition } from '../../index';
import type { IndexPatternField } from '../../../../types';
import type { OperationMetadata } from '../../../../../types';
import { dataPluginMock } from '../../../../../../../../../src/plugins/data/public/mocks';
import { tinymathFunctions } from '../util';
import {
  getSignatureHelp,
  getHover,
  suggest,
  monacoPositionToOffset,
  offsetToRowColumn,
  getInfoAtZeroIndexedPosition,
} from './math_completion';

const buildGenericColumn = (type: string) => {
  return ({ field }: { field?: IndexPatternField }) => {
    return {
      label: type,
      dataType: 'number',
      operationType: type,
      sourceField: field?.name ?? undefined,
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
    };
  };
};

const numericOperation = () => ({ dataType: 'number', isBucketed: false });
const stringOperation = () => ({ dataType: 'string', isBucketed: true });

// Only one of each type is needed
const operationDefinitionMap: Record<string, GenericOperationDefinition> = {
  sum: {
    type: 'sum',
    input: 'field',
    buildColumn: buildGenericColumn('sum'),
    getPossibleOperationForField: (field: IndexPatternField) =>
      field.type === 'number' ? numericOperation() : null,
    documentation: {
      section: 'elasticsearch',
      signature: 'field: string',
      description: 'description',
    },
  } as unknown as GenericOperationDefinition,
  count: {
    type: 'count',
    input: 'field',
    buildColumn: buildGenericColumn('count'),
    getPossibleOperationForField: (field: IndexPatternField) =>
      field.name === '___records___' ? numericOperation() : null,
  } as unknown as GenericOperationDefinition,
  last_value: {
    type: 'last_value',
    input: 'field',
    buildColumn: buildGenericColumn('last_value'),
    getPossibleOperationForField: (field: IndexPatternField) => ({
      dataType: field.type,
      isBucketed: false,
    }),
  } as unknown as GenericOperationDefinition,
  moving_average: {
    type: 'moving_average',
    input: 'fullReference',
    requiredReferences: [
      {
        input: ['field', 'managedReference'],
        validateMetadata: (meta: OperationMetadata) =>
          meta.dataType === 'number' && !meta.isBucketed,
      },
    ],
    operationParams: [{ name: 'window', type: 'number', required: true }],
    buildColumn: buildGenericColumn('moving_average'),
    getPossibleOperation: numericOperation,
  } as unknown as GenericOperationDefinition,
  cumulative_sum: {
    type: 'cumulative_sum',
    input: 'fullReference',
    buildColumn: buildGenericColumn('cumulative_sum'),
    getPossibleOperation: numericOperation,
  } as unknown as GenericOperationDefinition,
  terms: {
    type: 'terms',
    input: 'field',
    getPossibleOperationForField: stringOperation,
  } as unknown as GenericOperationDefinition,
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
    it('should list all valid functions at the top level (fake test)', async () => {
      // This test forces an invalid scenario, since the autocomplete actually requires
      // some typing
      const results = await suggest({
        expression: '',
        zeroIndexedOffset: 1,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
    });

    it('should list all valid sub-functions for a fullReference', async () => {
      const results = await suggest({
        expression: 'moving_average()',
        zeroIndexedOffset: 15,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '(',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toHaveLength(2);
      ['sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'operation' }]));
      });
    });

    it('should list all valid named arguments for a fullReference', async () => {
      const results = await suggest({
        expression: 'moving_average(count(),)',
        zeroIndexedOffset: 23,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: ',',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toEqual(['window']);
    });

    it('should not list named arguments when they are already in use', async () => {
      const results = await suggest({
        expression: 'moving_average(count(), window=5, )',
        zeroIndexedOffset: 34,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: ',',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toEqual([]);
    });

    it('should list all valid positional arguments for a tinymath function used by name', async () => {
      const results = await suggest({
        expression: 'divide(count(), )',
        zeroIndexedOffset: 16,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: ',',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
    });

    it('should list all valid positional arguments for a tinymath function used with alias', async () => {
      const results = await suggest({
        expression: 'count() / ',
        zeroIndexedOffset: 10,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: ',',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toHaveLength(4 + Object.keys(tinymathFunctions).length);
      ['sum', 'moving_average', 'cumulative_sum', 'last_value'].forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
      Object.keys(tinymathFunctions).forEach((key) => {
        expect(results.list).toEqual(expect.arrayContaining([{ label: key, type: 'math' }]));
      });
    });

    it('should not autocomplete any fields for the count function', async () => {
      const results = await suggest({
        expression: 'count()',
        zeroIndexedOffset: 6,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '(',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toHaveLength(0);
    });

    it('should autocomplete and validate the right type of field', async () => {
      const results = await suggest({
        expression: 'sum()',
        zeroIndexedOffset: 4,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '(',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toEqual(['bytes', 'memory']);
    });

    it('should autocomplete only operations that provide numeric output', async () => {
      const results = await suggest({
        expression: 'last_value()',
        zeroIndexedOffset: 11,
        context: {
          triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
          triggerCharacter: '(',
        },
        indexPattern: createMockedIndexPattern(),
        operationDefinitionMap,
        data: dataPluginMock.createStartContract(),
      });
      expect(results.list).toEqual(['bytes', 'memory']);
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
