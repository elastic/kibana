/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../../mocks';
import { formulaOperation, GenericOperationDefinition, IndexPatternColumn } from '../index';
import { FormulaIndexPatternColumn, regenerateLayerFromAst } from './formula';
import type { IndexPattern, IndexPatternField, IndexPatternLayer } from '../../../types';

jest.mock('../../layer_helpers', () => {
  return {
    getColumnOrder: ({ columns }: { columns: Record<string, IndexPatternColumn> }) =>
      Object.keys(columns),
  };
});

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

describe('formula', () => {
  let layer: IndexPatternLayer;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
      },
    };
  });

  describe('buildColumn', () => {
    let indexPattern: IndexPattern;

    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
    });

    it('should start with an empty formula if no previous column is detected', () => {
      expect(
        formulaOperation.buildColumn({
          layer: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
          indexPattern,
        })
      ).toEqual({
        label: 'Formula',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {},
        references: [],
      });
    });

    it('should move into Formula previous operation', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: layer.columns.col1,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: 'Formula',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: { isFormulaBroken: false, formula: 'terms(category)' },
        references: [],
      });
    });

    it('it should move over explicit format param if set', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: {
            ...layer.columns.col1,
            params: {
              ...layer.columns.col1.params,
              format: {
                id: 'number',
                params: {
                  decimals: 2,
                },
              },
            },
          } as IndexPatternColumn,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: 'Formula',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: 'terms(category)',
          params: {
            format: {
              id: 'number',
              params: {
                decimals: 2,
              },
            },
          },
        },
        references: [],
      });
    });

    it('should move over previous operation parameter if set', () => {
      expect(
        formulaOperation.buildColumn(
          {
            previousColumn: {
              label: 'Moving Average',
              dataType: 'number',
              operationType: 'moving_average',
              isBucketed: false,
              scale: 'ratio',
              references: ['col2'],
              timeScale: 'd',
              params: { window: 3 },
            },
            layer: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {
                col1: {
                  label: 'Moving Average',
                  dataType: 'number',
                  operationType: 'moving_average',
                  isBucketed: false,
                  scale: 'ratio',
                  references: ['col2'],
                  timeScale: 'd',
                  params: { window: 3 },
                },
                col2: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'col1X0',
                  operationType: 'avg',
                  scale: 'ratio',
                  sourceField: 'bytes',
                  timeScale: 'd',
                },
              },
            },
            indexPattern,
          },
          {},
          operationDefinitionMap
        )
      ).toEqual({
        label: 'Formula',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: 'moving_average(avg(bytes), window=3)',
        },
        references: [],
      });
    });
  });

  describe('regenerateLayerFromAst()', () => {
    let indexPattern: IndexPattern;
    let currentColumn: FormulaIndexPatternColumn;

    function testIsBrokenFormula(formula: string) {
      expect(
        regenerateLayerFromAst(
          formula,
          layer,
          'col1',
          currentColumn,
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual({
        ...layer,
        columns: {
          ...layer.columns,
          col1: {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              formula,
              isFormulaBroken: true,
            },
          },
        },
      });
    }

    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
      currentColumn = {
        label: 'Formula',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: { formula: '', isFormulaBroken: false },
        references: [],
      };
    });

    it('should mutate the layer with new columns for valid formula expressions', () => {
      expect(
        regenerateLayerFromAst(
          'avg(bytes)',
          layer,
          'col1',
          currentColumn,
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual({
        ...layer,
        columnOrder: ['col1X0', 'col1X1', 'col1'],
        columns: {
          ...layer.columns,
          col1: {
            ...currentColumn,
            references: ['col1X1'],
            params: {
              ...currentColumn.params,
              formula: 'avg(bytes)',
              isFormulaBroken: false,
            },
          },
          col1X0: {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'col1X0',
            operationType: 'avg',
            scale: 'ratio',
            sourceField: 'bytes',
            timeScale: false,
          },
          col1X1: {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'col1X1',
            operationType: 'math',
            params: {
              tinymathAst: 'col1X0',
            },
            references: ['col1X0'],
            scale: 'ratio',
          },
        },
      });
    });

    it('returns no change but error if the formula cannot be parsed', () => {
      const formulas = [
        '+',
        'avg((',
        'avg((bytes)',
        'avg(bytes) +',
        'avg(""',
        'moving_average(avg(bytes), window=)',
        'avg(bytes) + moving_average(avg(bytes), window=)',
      ];
      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if field is used with no Lens wrapping operation', () => {
      testIsBrokenFormula('bytes');
    });

    it('returns no change but error if at least one field in the formula is missing', () => {
      const formulas = [
        'noField',
        'avg(noField)',
        'noField + 1',
        'derivative(avg(noField))',
        'avg(bytes) + derivative(avg(noField))',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if at least one operation in the formula is missing', () => {
      const formulas = [
        'noFn()',
        'noFn(bytes)',
        'avg(bytes) + noFn()',
        'derivative(noFn())',
        'noFn() + noFnTwo()',
        'noFn(noFnTwo())',
        'noFn() + noFnTwo() + 5',
        'avg(bytes) + derivative(noFn())',
        'derivative(avg(bytes) + noFn())',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if one operation has the wrong first argument', () => {
      const formulas = [
        'avg(7)',
        'avg()',
        'avg(avg(bytes))',
        'avg(1 + 2)',
        'avg(bytes + 5)',
        'avg(bytes + bytes)',
        'derivative(7)',
        'derivative(bytes + 7)',
        'derivative(bytes + bytes)',
        'derivative(bytes + avg(bytes))',
        'derivative(bytes + 7 + avg(bytes))',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change by error if an argument is passed to count operation', () => {
      const formulas = ['count(7)', 'count("bytes")', 'count(bytes)'];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if a required parameter is not passed to the operation in formula', () => {
      const formula = 'moving_average(avg(bytes))';
      testIsBrokenFormula(formula);
    });

    it('returns no change but error if a required parameter passed with the wrong type in formula', () => {
      const formula = 'moving_average(avg(bytes), window="m")';
      testIsBrokenFormula(formula);
    });

    it('returns error if a required parameter is passed multiple time', () => {
      const formula = 'moving_average(avg(bytes), window=7, window=3)';
      testIsBrokenFormula(formula);
    });
  });

  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;

    function getNewLayerWithFormula(formula: string, isBroken = true): IndexPatternLayer {
      return {
        columns: {
          col1: {
            label: 'Formula',
            dataType: 'number',
            operationType: 'formula',
            isBucketed: false,
            scale: 'ratio',
            params: { formula, isFormulaBroken: isBroken },
            references: [],
          },
        },
        columnOrder: [],
        indexPatternId: '',
      };
    }
    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
    });

    it('returns undefined if count is passed without arguments', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('count()'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a field operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg(bytes)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
      // note that field names can be wrapped in quotes as well
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg("bytes")'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(avg(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(avg("bytes"))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the arguments', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes), window=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);

      // Not sure it will be supported
      //   expect(
      //     formulaOperation.getErrorMessage!(
      //       getNewLayerWithFormula('moving_average(avg("bytes"), "window"=7)'),
      //       'col1',
      //       indexPattern,
      //       operationDefinitionMap
      //     )
      //   ).toEqual(undefined);
    });

    it('returns an error if field is used with no Lens wrapping operation', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('bytes'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([`The field bytes cannot be used without operation`]);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('bytes + bytes'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([`Math operations are allowed between operations, not fields`]);
    });

    it('returns an error if parsing a syntax invalid formula', () => {
      const formulas = [
        '+',
        'avg((',
        'avg((bytes)',
        'avg(bytes) +',
        'avg(""',
        'moving_average(avg(bytes), window=)',
      ];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([`The Formula ${formula} cannot be parsed`]);
      }
    });

    it('returns an error if the field is missing', () => {
      const formulas = ['noField', 'avg(noField)', 'noField + 1', 'derivative(avg(noField))'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Field noField not found']);
      }
    });

    it('returns an error with plural form correctly handled', () => {
      const formulas = ['noField + noField2', 'noField + 1 + noField2'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Fields noField, noField2 not found']);
      }
    });

    it('returns an error if an operation is unknown', () => {
      const formulas = ['noFn()', 'noFn(bytes)', 'avg(bytes) + noFn()', 'derivative(noFn())'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Operation noFn not found']);
      }

      const multipleFnFormulas = ['noFn() + noFnTwo()', 'noFn(noFnTwo())'];

      for (const formula of multipleFnFormulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Operations noFn, noFnTwo not found']);
      }
    });

    it('returns an error if field operation in formula have the wrong first argument', () => {
      const formulas = [
        'avg(7)',
        'avg()',
        'avg(avg(bytes))',
        'avg(1 + 2)',
        'avg(bytes + 5)',
        'avg(bytes + bytes)',
        'derivative(7)',
      ];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(
          // some formulas may contain more errors
          expect.arrayContaining([
            expect.stringMatching(
              `The first argument for ${formula.substring(0, formula.indexOf('('))}`
            ),
          ])
        );
      }
    });

    it('returns an error if an argument is passed to count() operation', () => {
      const formulas = ['count(7)', 'count("bytes")', 'count(bytes)'];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['The operation count does not accept any field as argument']);
      }
    });

    it('returns an error if an operation with required parameters does not receive them', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The operation moving_average in the Formula is missing the following parameters: window',
      ]);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes), myparam=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The operation moving_average in the Formula is missing the following parameters: window',
      ]);
    });

    it('returns an error if a parameter is passed to an operation with no parameters', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('avg(bytes, myparam=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(['The operation avg does not accept any parameter']);
    });

    it('returns an error if the parameter passed to an operation is of the wrong type', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(avg(bytes), window="m")'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The parameters for the operation moving_average in the Formula are of the wrong type: window',
      ]);
    });

    it('returns no error for the demo formula example', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(`
          moving_average(
            cumulative_sum(
               7 * clamp(sum(bytes), 0, last_value(memory) + max(memory))
            ), window=10
          )
          `),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns no error if a math operation is passed to fullReference operations', () => {
      const formulas = [
        'derivative(7+1)',
        'derivative(7+avg(bytes))',
        'moving_average(7+avg(bytes), window=7)',
      ];
      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(undefined);
      }
    });
  });
});
