/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import { createMockedIndexPattern } from '../../../../mocks';
import { GenericOperationDefinition } from '../../index';
import type { IndexPatternField } from '../../../../types';
import type { OperationMetadata } from '../../../../../types';
import { dataPluginMock } from '../../../../../../../../../src/plugins/data/public/mocks';
import { tinymathFunctions } from '../util';
import { getSignatureHelp, getHover, suggest } from './math_completion';

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
  sum: ({
    type: 'sum',
    input: 'field',
    buildColumn: buildGenericColumn('sum'),
    getPossibleOperationForField: (field: IndexPatternField) =>
      field.type === 'number' ? numericOperation() : null,
  } as unknown) as GenericOperationDefinition,
  count: ({
    type: 'count',
    input: 'field',
    buildColumn: buildGenericColumn('count'),
    getPossibleOperationForField: (field: IndexPatternField) =>
      field.name === 'Records' ? numericOperation() : null,
  } as unknown) as GenericOperationDefinition,
  last_value: ({
    type: 'last_value',
    input: 'field',
    buildColumn: buildGenericColumn('last_value'),
    getPossibleOperationForField: (field: IndexPatternField) => ({
      dataType: field.type,
      isBucketed: false,
    }),
  } as unknown) as GenericOperationDefinition,
  moving_average: ({
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
  } as unknown) as GenericOperationDefinition,
  cumulative_sum: ({
    type: 'cumulative_sum',
    input: 'fullReference',
    buildColumn: buildGenericColumn('cumulative_sum'),
    getPossibleOperation: numericOperation,
  } as unknown) as GenericOperationDefinition,
  terms: ({
    type: 'terms',
    input: 'field',
    getPossibleOperationForField: stringOperation,
  } as unknown) as GenericOperationDefinition,
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
        label: 'sum(field)',
        parameters: [{ label: 'field' }],
      });
    });

    it('should return a signature for count', () => {
      expect(unwrapSignatures(getSignatureHelp('count()', 6, operationDefinitionMap))).toEqual({
        label: 'count()',
        parameters: [],
      });
    });

    it('should return a signature for a function with named parameters', () => {
      expect(
        unwrapSignatures(
          getSignatureHelp('2 * moving_average(count(), window=)', 35, operationDefinitionMap)
        )
      ).toEqual({
        label: 'moving_average(function, window=number)',
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
      ).toEqual({ label: 'count()', parameters: [] });
    });

    it('should return a signature for a complex tinymath function', () => {
      expect(
        unwrapSignatures(getSignatureHelp('clamp(count(), 5)', 7, operationDefinitionMap))
      ).toEqual({
        label: 'clamp(expression, min, max)',
        parameters: [
          { label: 'expression', documentation: '' },
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
        contents: [{ value: 'sum(field)' }],
      });
    });

    it('should show signature for count', () => {
      expect(getHover('count()', 2, operationDefinitionMap)).toEqual({
        contents: [{ value: 'count()' }],
      });
    });

    it('should show signature for a function with named parameters', () => {
      expect(getHover('2 * moving_average(count())', 10, operationDefinitionMap)).toEqual({
        contents: [{ value: 'moving_average(function, window=number)' }],
      });
    });

    it('should show signature for an inner function', () => {
      expect(getHover('2 * moving_average(count())', 22, operationDefinitionMap)).toEqual({
        contents: [{ value: 'count()' }],
      });
    });

    it('should show signature for a complex tinymath function', () => {
      expect(getHover('clamp(count(), 5)', 2, operationDefinitionMap)).toEqual({
        contents: [{ value: 'clamp(expression, min, max)' }],
      });
    });
  });

  describe('autocomplete', () => {
    it('should list all valid functions at the top level (fake test)', async () => {
      // This test forces an invalid scenario, since the autocomplete actually requires
      // some typing
      const results = await suggest({
        expression: '',
        position: 1,
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
        position: 15,
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
        position: 23,
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
        position: 34,
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
        position: 16,
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
        position: 10,
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
        position: 6,
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
        position: 4,
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
        position: 11,
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
});
