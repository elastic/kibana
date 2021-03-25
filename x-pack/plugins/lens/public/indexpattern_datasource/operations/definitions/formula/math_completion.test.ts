/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import { getSignatureHelp } from './math_completion';
import { createMockedIndexPattern } from '../../../mocks';
import { formulaOperation, GenericOperationDefinition, IndexPatternColumn } from '../index';
import { FormulaIndexPatternColumn, regenerateLayerFromAst } from './formula';
import type { IndexPattern, IndexPatternField, IndexPatternLayer } from '../../../types';
import { tinymathFunctions } from './util';

const operationDefinitionMap: Record<string, GenericOperationDefinition> = {
  avg: ({
    input: 'field',
    buildColumn: ({ field }: { field: IndexPatternField }) => ({
      label: 'avg',
      dataType: 'number',
      operationType: 'avg',
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
    }),
  } as unknown) as GenericOperationDefinition,
  terms: { input: 'field' } as GenericOperationDefinition,
  sum: { input: 'field' } as GenericOperationDefinition,
  last_value: { input: 'field' } as GenericOperationDefinition,
  max: { input: 'field' } as GenericOperationDefinition,
  count: { input: 'field' } as GenericOperationDefinition,
  derivative: { input: 'fullReference' } as GenericOperationDefinition,
  moving_average: {
    input: 'fullReference',
    operationParams: [{ name: 'window', type: 'number', required: true }],
  } as GenericOperationDefinition,
  cumulative_sum: { input: 'fullReference' } as GenericOperationDefinition,
};

describe('math completion', () => {
  describe('signature help', () => {
    function unwrapSignatures(signatureResult: monaco.languages.SignatureHelpResult) {
      return signatureResult.value.signatures[0];
    }

    it('should silently handle parse errors', () => {
      expect(getSignatureHelp());
    });
  });
});
