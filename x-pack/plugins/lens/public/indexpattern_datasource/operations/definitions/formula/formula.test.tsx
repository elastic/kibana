/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern } from '../../../mocks';
import { formulaOperation, GenericOperationDefinition, GenericIndexPatternColumn } from '../index';
import { FormulaIndexPatternColumn } from './formula';
import { insertOrReplaceFormulaColumn } from './parse';
import type { IndexPattern, IndexPatternField, IndexPatternLayer } from '../../../types';
import { tinymathFunctions } from './util';
import { TermsIndexPatternColumn } from '../terms';
import { MovingAverageIndexPatternColumn } from '../calculations';
import { StaticValueIndexPatternColumn } from '../static_value';
import { getFilter } from '../helpers';

jest.mock('../../layer_helpers', () => {
  return {
    getColumnOrder: jest.fn(({ columns }: { columns: Record<string, GenericIndexPatternColumn> }) =>
      Object.keys(columns)
    ),
    getManagedColumnsFrom: jest.fn().mockReturnValue([]),
  };
});

interface PartialColumnParams {
  kql?: string;
  lucene?: string;
  shift?: string;
}

const operationDefinitionMap: Record<string, GenericOperationDefinition> = {
  average: {
    input: 'field',
    buildColumn: ({ field }: { field: IndexPatternField }) => ({
      label: 'avg',
      dataType: 'number',
      operationType: 'average',
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
    }),
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
  terms: {
    input: 'field',
    getPossibleOperationForField: () => ({ scale: 'ordinal' }),
  } as unknown as GenericOperationDefinition,
  sum: {
    input: 'field',
    filterable: true,
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
  last_value: {
    input: 'field',
    getPossibleOperationForField: ({ type }) => ({
      scale: type === 'string' ? 'ordinal' : 'ratio',
    }),
  } as GenericOperationDefinition,
  max: {
    input: 'field',
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
  count: {
    input: 'field',
    filterable: true,
    buildColumn: ({ field }: { field: IndexPatternField }, columnsParams: PartialColumnParams) => ({
      label: 'avg',
      dataType: 'number',
      operationType: 'count',
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
      filter: getFilter(undefined, columnsParams),
    }),
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
  derivative: {
    input: 'fullReference',
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
  moving_average: {
    input: 'fullReference',
    operationParams: [{ name: 'window', type: 'number', required: true }],
    buildColumn: (
      { references }: { references: string[] },
      columnsParams: PartialColumnParams
    ) => ({
      label: 'moving_average',
      dataType: 'number',
      operationType: 'moving_average',
      isBucketed: false,
      scale: 'ratio',
      timeScale: false,
      params: { window: 5 },
      references,
      filter: getFilter(undefined, columnsParams),
    }),
    getErrorMessage: () => ['mock error'],
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
    filterable: true,
  } as unknown as GenericOperationDefinition,
  cumulative_sum: {
    input: 'fullReference',
    getPossibleOperationForField: () => ({ scale: 'ratio' }),
  } as unknown as GenericOperationDefinition,
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
        } as TermsIndexPatternColumn,
      },
    };
  });

  describe('buildColumn', () => {
    let indexPattern: IndexPattern;

    beforeEach(() => {
      layer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Average',
            dataType: 'number',
            operationType: 'average',
            isBucketed: false,
            scale: 'ratio',
            sourceField: 'bytes',
          },
        },
      };
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
        label: 'average(bytes)',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: { isFormulaBroken: false, formula: 'average(bytes)' },
        references: [],
      });
    });

    it('it should move over explicit format param if set', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: {
            ...layer.columns.col1,
            params: {
              format: {
                id: 'number',
                params: {
                  decimals: 2,
                },
              },
            },
          } as GenericIndexPatternColumn,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: 'average(bytes)',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: 'average(bytes)',
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
        references: [],
      });
    });

    it('it should move over kql arguments if set', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: {
            ...layer.columns.col1,
            filter: {
              language: 'kuery',
              // Need to test with multiple replaces due to string replace
              query: `category.keyword: "Men's Clothing" or category.keyword: "Men's Shoes"`,
            },
          } as GenericIndexPatternColumn,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: `average(bytes, kql='category.keyword: "Men\\'s Clothing" or category.keyword: "Men\\'s Shoes"')`,
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: `average(bytes, kql='category.keyword: "Men\\'s Clothing" or category.keyword: "Men\\'s Shoes"')`,
        },
        references: [],
      });
    });

    it('it should move over lucene arguments if set', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: {
            ...layer.columns.col1,
            operationType: 'count',
            sourceField: '___records___',
            filter: {
              language: 'lucene',
              query: `*`,
            },
          } as GenericIndexPatternColumn,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: `count(lucene='*')`,
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: `count(lucene='*')`,
        },
        references: [],
      });
    });

    it('should move over previous operation parameter if set - only numeric', () => {
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
            } as MovingAverageIndexPatternColumn,
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
                } as MovingAverageIndexPatternColumn,
                col2: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'col1X0',
                  operationType: 'average',
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
        label: 'moving_average(average(bytes), window=3)',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          isFormulaBroken: false,
          formula: 'moving_average(average(bytes), window=3)',
        },
        references: [],
        timeScale: 'd',
      });
    });

    it('should not move previous column configuration if not numeric', () => {
      expect(
        formulaOperation.buildColumn(
          {
            previousColumn: {
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
            } as TermsIndexPatternColumn,
            layer: {
              indexPatternId: '1',
              columnOrder: [],
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
                } as TermsIndexPatternColumn,
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
        params: {},
        references: [],
      });
    });

    it('should move into Formula previous static_value operation', () => {
      expect(
        formulaOperation.buildColumn({
          previousColumn: {
            label: 'Static value: 0',
            dataType: 'number',
            isBucketed: false,
            operationType: 'static_value',
            references: [],
            params: {
              value: '0',
            },
          } as StaticValueIndexPatternColumn,
          layer,
          indexPattern,
        })
      ).toEqual({
        label: '0',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: { isFormulaBroken: false, formula: '0' },
        references: [],
      });
    });
  });

  describe('insertOrReplaceFormulaColumn()', () => {
    let indexPattern: IndexPattern;
    let currentColumn: FormulaIndexPatternColumn;

    function testIsBrokenFormula(
      formula: string,
      partialColumn: Partial<Pick<FormulaIndexPatternColumn, 'filter'>> = {}
    ) {
      const mergedColumn = {
        ...currentColumn,
        ...partialColumn,
      };
      const mergedLayer = { ...layer, columns: { ...layer.columns, col1: mergedColumn } };

      expect(
        insertOrReplaceFormulaColumn(
          'col1',
          {
            ...mergedColumn,
            params: {
              ...mergedColumn.params,
              formula,
            },
          },
          mergedLayer,
          {
            indexPattern,
            operations: operationDefinitionMap,
          }
        ).layer
      ).toEqual({
        ...mergedLayer,
        columns: {
          ...mergedLayer.columns,
          col1: {
            ...mergedColumn,
            label: formula,
            params: {
              ...mergedColumn.params,
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
        insertOrReplaceFormulaColumn(
          'col1',
          {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              formula: 'average(bytes)',
            },
          },
          layer,
          {
            indexPattern,
            operations: operationDefinitionMap,
          }
        ).layer
      ).toEqual({
        ...layer,
        columnOrder: ['col1X0', 'col1'],
        columns: {
          ...layer.columns,
          col1: {
            ...currentColumn,
            label: 'average(bytes)',
            references: ['col1X0'],
            params: {
              ...currentColumn.params,
              formula: 'average(bytes)',
              isFormulaBroken: false,
            },
          },
          col1X0: {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of average(bytes)',
            operationType: 'average',
            scale: 'ratio',
            sourceField: 'bytes',
            timeScale: false,
          },
        },
      });
    });

    it('should create a valid formula expression for numeric literals', () => {
      expect(
        insertOrReplaceFormulaColumn(
          'col1',
          {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              formula: '0',
            },
          },
          layer,
          {
            indexPattern,
            operations: operationDefinitionMap,
          }
        ).layer
      ).toEqual({
        ...layer,
        columnOrder: ['col1X0', 'col1'],
        columns: {
          ...layer.columns,
          col1: {
            ...currentColumn,
            label: '0',
            references: ['col1X0'],
            params: {
              ...currentColumn.params,
              formula: '0',
              isFormulaBroken: false,
            },
          },
          col1X0: {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of 0',
            operationType: 'math',
            params: {
              tinymathAst: 0,
            },
            references: [],
            scale: 'ratio',
          },
        },
      });
    });

    it('returns no change but error if the formula cannot be parsed', () => {
      const formulas = [
        '+',
        'average((',
        'average((bytes)',
        'average(bytes) +',
        'average(""',
        'moving_average(average(bytes), window=)',
        'average(bytes) + moving_average(average(bytes), window=)',
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
        'average(noField)',
        'noField + 1',
        'derivative(average(noField))',
        'average(bytes) + derivative(average(noField))',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if at least one operation in the formula is missing', () => {
      const formulas = [
        'noFn()',
        'noFn(bytes)',
        'average(bytes) + noFn()',
        'derivative(noFn())',
        'noFn() + noFnTwo()',
        'noFn(noFnTwo())',
        'noFn() + noFnTwo() + 5',
        'average(bytes) + derivative(noFn())',
        'derivative(average(bytes) + noFn())',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if one operation has the wrong first argument', () => {
      const formulas = [
        'average(7)',
        'average()',
        'average(average(bytes))',
        'average(1 + 2)',
        'average(bytes + 5)',
        'average(bytes + bytes)',
        'derivative(7)',
        'derivative(bytes + 7)',
        'derivative(bytes + bytes)',
        'derivative(bytes + average(bytes))',
        'derivative(bytes + 7 + average(bytes))',
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if an argument is passed to count operation', () => {
      const formulas = ['count(7)', 'count("bytes")', 'count(bytes)'];

      for (const formula of formulas) {
        testIsBrokenFormula(formula);
      }
    });

    it('returns no change but error if a required parameter is not passed to the operation in formula', () => {
      const formula = 'moving_average(average(bytes))';
      testIsBrokenFormula(formula);
    });

    it('returns no change but error if a required parameter passed with the wrong type in formula', () => {
      const formula = 'moving_average(average(bytes), window="m")';
      testIsBrokenFormula(formula);
    });

    it('returns error if a required parameter is passed multiple time', () => {
      const formula = 'moving_average(average(bytes), window=7, window=3)';
      testIsBrokenFormula(formula);
    });

    it('returns error if a math operation has less arguments than required', () => {
      const formula = 'pow(5)';
      testIsBrokenFormula(formula);
    });

    it('returns error if a math operation has the wrong argument type', () => {
      const formula = 'pow(bytes)';
      testIsBrokenFormula(formula);
    });

    it('returns a filter type error if query types mismatch between column filter and inner formula one', () => {
      const formulas = [
        `count(kql='bytes > 4000')`,
        `count(lucene='bytes:[400 TO *]') + count(kql='bytes > 4000')`,
        `moving_average(average(bytes), kql='bytes: *', window=7)`,
        `moving_average(sum(bytes, kql='bytes: *'), window=7)`,
      ];

      for (const formula of formulas) {
        testIsBrokenFormula(formula, { filter: { language: 'lucene', query: 'bytes:[400 TO *]' } });
      }
    });

    it('returns the locations of each function', () => {
      expect(
        insertOrReplaceFormulaColumn(
          'col1',
          {
            ...currentColumn,
            params: {
              ...currentColumn.params,
              formula: 'moving_average(average(bytes), window=7) + count()',
            },
          },
          layer,
          {
            indexPattern,
            operations: operationDefinitionMap,
          }
        ).meta.locations
      ).toEqual({
        col1X0: { min: 15, max: 29 },
        col1X1: { min: 0, max: 41 },
        col1X2: { min: 42, max: 50 },
      });
    });

    it('add the formula filter to supported operations', () => {
      const filter = { language: 'kuery', query: 'bytes > 4000' };
      const mergedColumn = { ...currentColumn, filter };
      const mergedLayer = { ...layer, columns: { ...layer.columns, col1: mergedColumn } };
      const formula = 'moving_average(average(bytes), window=7) + count()';

      const { layer: newLayer } = insertOrReplaceFormulaColumn(
        'col1',
        {
          ...mergedColumn,
          params: {
            ...mergedColumn.params,
            formula,
          },
        },
        mergedLayer,
        {
          indexPattern,
          operations: operationDefinitionMap,
        }
      );

      // average and math are not filterable in the mocks
      expect(newLayer.columns).toEqual(
        expect.objectContaining({
          col1: expect.objectContaining({
            label: formula,
            filter,
          }),
          col1X1: expect.objectContaining({
            operationType: 'moving_average',
            filter,
          }),
          col1X2: expect.objectContaining({
            operationType: 'count',
            filter,
          }),
        })
      );

      expect(newLayer.columns).toEqual(
        expect.objectContaining({
          col1X0: expect.not.objectContaining({
            filter,
          }),
          col1X3: expect.not.objectContaining({
            filter,
          }),
        })
      );
    });
    it('prepend formula filter to supported operations', () => {
      const filter = { language: 'kuery', query: 'bytes > 4000' };
      const innerFilter = 'bytes > 5000';
      const mergedColumn = { ...currentColumn, filter };
      const mergedLayer = { ...layer, columns: { ...layer.columns, col1: mergedColumn } };
      const formula = `moving_average(average(bytes), window=7, kql='${innerFilter}') + count(kql='${innerFilter}')`;

      const { layer: newLayer } = insertOrReplaceFormulaColumn(
        'col1',
        {
          ...mergedColumn,
          params: {
            ...mergedColumn.params,
            formula,
          },
        },
        mergedLayer,
        {
          indexPattern,
          operations: operationDefinitionMap,
        }
      );

      // average and math are not filterable in the mocks
      expect(newLayer.columns).toEqual(
        expect.objectContaining({
          col1: expect.objectContaining({
            label: formula,
            filter,
          }),
          col1X1: expect.objectContaining({
            operationType: 'moving_average',
            filter: {
              ...filter,
              query: `(${filter.query}) AND (${innerFilter})`,
            },
          }),
          col1X2: expect.objectContaining({
            operationType: 'count',
            filter: {
              ...filter,
              query: `(${filter.query}) AND (${innerFilter})`,
            },
          }),
        })
      );
    });
  });

  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;

    function getNewLayerWithFormula(
      formula: string,
      isBroken = true,
      columnParams: Partial<Pick<FormulaIndexPatternColumn, 'filter'>> = {}
    ): IndexPatternLayer {
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
            ...columnParams,
          } as FormulaIndexPatternColumn,
        },
        columnOrder: ['col1'],
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

    it('returns undefined if count is passed with only a named argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(`count(kql='*')`, false),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns a syntax error if the kql argument does not parse', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(`count(kql='invalid: "')`, false),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        `Expected "(", "{", value, whitespace but """ found.
invalid: "
---------^`,
      ]);
    });

    it('returns undefined if a field operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('average(bytes)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
      // note that field names can be wrapped in quotes as well
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('average("bytes")'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the correct first argument', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(average(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('derivative(average("bytes"))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns undefined if a fullReference operation is passed with the arguments', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(average(bytes), window=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
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
      ).toEqual([`The operation add does not accept any field as argument`]);
    });

    it('returns an error if parsing a syntax invalid formula', () => {
      const formulas = [
        '+',
        'average((',
        'average((bytes)',
        'average(bytes) +',
        'average(""',
        'moving_average(average(bytes), window=)',
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
      const formulas = [
        'noField',
        'average(noField)',
        'noField + 1',
        'derivative(average(noField))',
      ];

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
      const formulas = ['noFn()', 'noFn(bytes)', 'average(bytes) + noFn()', 'derivative(noFn())'];

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

    it('returns an error if formula or math operations are used', () => {
      const formulaFormulas = ['formula()', 'formula(bytes)', 'formula(formula())'];

      for (const formula of formulaFormulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Operation formula not found']);
      }

      const mathFormulas = ['math()', 'math(bytes)', 'math(math())'];

      for (const formula of mathFormulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(['Operation math not found']);
      }
    });

    it('returns an error if field operation in formula have the wrong first argument', () => {
      const formulas = [
        'average(7)',
        'average()',
        'average(average(bytes))',
        'average(1 + 2)',
        'average(bytes + 5)',
        'average(bytes + bytes)',
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
          getNewLayerWithFormula('moving_average(average(bytes))'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'The operation moving_average in the Formula is missing the following parameters: window',
      ]);

      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(average(bytes), myparam=7)'),
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
          getNewLayerWithFormula('average(bytes, myparam=7)'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(['The operation average does not accept any parameter']);
    });

    it('returns an error if first argument type is passed multiple times', () => {
      const formulas = [
        'average(bytes, bytes)',
        "sum(bytes, kql='category.keyword: *', bytes)",
        'moving_average(average(bytes), average(bytes))',
        "moving_average(average(bytes), kql='category.keyword: *', average(bytes))",
        'moving_average(average(bytes, bytes), count())',
        'moving_average(moving_average(average(bytes, bytes), count(), count()))',
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
          expect.arrayContaining([
            expect.stringMatching(
              /The operation (moving_average|average|sum) in the Formula requires a single (field|metric), found:/
            ),
          ])
        );
      }
    });

    it('returns an error if a function received an argument of the wrong argument type in any position', () => {
      const formulas = [
        'average(bytes, count())',
        "sum(bytes, kql='category.keyword: *', count(), count())",
        'average(bytes, bytes + 1)',
        'average(count(), bytes)',
        'moving_average(average(bytes), bytes)',
        'moving_average(bytes, bytes)',
        'moving_average(average(bytes), window=7, bytes)',
        'moving_average(window=7, bytes)',
        "moving_average(kql='category.keyword: *', bytes)",
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
          expect.arrayContaining([
            expect.stringMatching(
              /The operation (moving_average|average|sum) in the Formula does not support (metric|field) parameters, found:/
            ),
          ])
        );
      }
    });

    it('returns an error if the parameter passed to an operation is of the wrong type', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('moving_average(average(bytes), window="m")'),
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

    it('returns no error for a query edge case', () => {
      const formulas = [
        `count(kql='')`,
        `count(lucene='')`,
        `moving_average(count(kql=''), window=7)`,
        `count(kql='bytes >= 4000')`,
        `count(kql='bytes <= 4000')`,
        `count(kql='bytes = 4000')`,
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

    it('returns an error for a query not wrapped in single quotes', () => {
      const formulas = [
        `count(kql="")`,
        `count(kql='")`,
        `count(kql="')`,
        `count(kql="category.keyword: *")`,
        `count(kql='category.keyword: *")`,
        `count(kql="category.keyword: *')`,
        `count(kql='category.keyword: *)`,
        `count(kql=category.keyword: *')`,
        `count(kql=category.keyword: *)`,
        `count(kql="category.keyword: "Men's Clothing" or category.keyword: "Men's Shoes"")`,
        `count(lucene="category.keyword: *")`,
        `count(lucene=category.keyword: *)`,
        `count(lucene=category.keyword: *) + average(bytes)`,
        `count(lucene='category.keyword: *') + count(kql=category.keyword: *)`,
        `count(lucene='category.keyword: *") + count(kql='category.keyword: *")`,
        `count(lucene='category.keyword: *') + count(kql=category.keyword: *, kql='category.keyword: *')`,
        `count(lucene='category.keyword: *') + count(kql="category.keyword: *")`,
        `moving_average(count(kql=category.keyword: *), window=7, kql=category.keywork: *)`,
        `moving_average(
          cumulative_sum(
             7 * clamp(sum(bytes), 0, last_value(memory) + max(memory))
          ), window=10, kql=category.keywork: *
        )`,
      ];
      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(expect.arrayContaining([expect.stringMatching(`Single quotes are required`)]));
      }
    });

    it('it returns parse fail error rather than query message if the formula is only a query condition (false positive cases for query checks)', () => {
      const formulas = [
        `kql="category.keyword: *"`,
        `kql=category.keyword: *`,
        `kql='category.keyword: *'`,
        `(kql="category.keyword: *")`,
        `(kql=category.keyword: *)`,
        `(lucene="category.keyword: *")`,
        `(lucene=category.keyword: *)`,
        `(lucene='category.keyword: *') + (kql=category.keyword: *)`,
        `(lucene='category.keyword: *') + (kql=category.keyword: *, kql='category.keyword: *')`,
        `(lucene='category.keyword: *') + (kql="category.keyword: *")`,
        `((kql=category.keyword: *), window=7, kql=category.keywork: *)`,
        `(, window=10, kql=category.keywork: *)`,
        `(
          , window=10, kql=category.keywork: *
        )`,
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

    it('returns no error for a query wrapped in single quotes but with some whitespaces', () => {
      const formulas = [
        `count(kql ='category.keyword: *')`,
        `count(kql = 'category.keyword: *')`,
        `count(kql =    'category.keyword: *')`,
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

    it('returns an error for multiple queries submitted for the same function', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(`count(kql='category.keyword: *', lucene='category.keyword: *')`),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(['Use only one of kql= or lucene=, not both']);
    });

    it("returns a clear error when there's a missing field for a function", () => {
      for (const fn of ['average', 'terms', 'max', 'sum']) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(`${fn}()`),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([`The first argument for ${fn} should be a field name. Found no field`]);
      }
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(`sum(kql='category.keyword: *')`),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([`The first argument for sum should be a field name. Found category.keyword: *`]);
    });

    it("returns a clear error when there's a missing function for a fullReference operation", () => {
      for (const fn of ['cumulative_sum', 'derivative']) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(`${fn}()`),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([`The first argument for ${fn} should be a operation name. Found no operation`]);
      }
    });

    it('returns an error if the formula is fully static and there is at least one bucket dimension', () => {
      const formulaLayer = getNewLayerWithFormula('5 + 3 * 7');
      expect(
        formulaOperation.getErrorMessage!(
          {
            ...formulaLayer,
            columns: {
              ...formulaLayer.columns,
              col0: {
                dataType: 'date',
                isBucketed: true,
                label: '',
                operationType: 'date_histogram',
                references: [],
                sourceField: 'ts',
              },
            },
            columnOrder: ['col0', 'col1'],
          },
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        'A layer with only static values will not show results, use at least one dynamic metric',
      ]);
    });

    it('returns no error if the formula is fully static and there is no bucket dimension', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula('5 + 3 * 7'),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual(undefined);
    });

    it('returns no error if a math operation is passed to fullReference operations', () => {
      const formulas = [
        'derivative(7+1)',
        'derivative(7+average(bytes))',
        'moving_average(7+average(bytes), window=7)',
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

    it('returns errors if math operations are used with no arguments', () => {
      const formulas = [
        'derivative(7+1)',
        'derivative(7+average(bytes))',
        'moving_average(7+average(bytes), window=7)',
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

    it('returns errors if the returned type of an operation is not supported by Formula', () => {
      // check only "valid" operations which are strictly not supported by Formula
      // as for last_value with ordinal data
      const formulas = [
        { formula: 'last_value(dest)' },
        { formula: 'terms(dest)' },
        { formula: 'moving_average(last_value(dest), window=7)', errorFormula: 'last_value(dest)' },
      ];
      for (const { formula, errorFormula } of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([
          `The return value type of the operation ${
            errorFormula ?? formula
          } is not supported in Formula.`,
        ]);
      }
    });

    // there are 4 types of errors for math functions:
    // * no argument passed
    // * too many arguments passed
    // * field passed
    // * missing argument
    const errors = [
      (operation: string) =>
        `The first argument for ${operation} should be a operation name. Found ()`,
      (operation: string) => `The operation ${operation} has too many arguments`,
      (operation: string) => `The operation ${operation} does not accept any field as argument`,
      (operation: string) => {
        const required = tinymathFunctions[operation].positionalArguments.filter(
          ({ optional }) => !optional
        );
        return `The operation ${operation} in the Formula is missing ${
          required.length - 1
        } arguments: ${required
          .slice(1)
          .map(({ name }) => name)
          .join(', ')}`;
      },
    ];
    // we'll try to map all of these here in this test
    for (const fn of Object.keys(tinymathFunctions)) {
      it(`returns an error for the math functions available: ${fn}`, () => {
        const nArgs = tinymathFunctions[fn].positionalArguments;
        // start with the first 3 types
        const formulas = [
          `${fn}()`,
          `${fn}(1, 2, 3, 4, 5)`,
          // to simplify a bit, add the required number of args by the function filled with the field name
          `${fn}(${Array(nArgs.length).fill('bytes').join(', ')})`,
        ];
        // add the fourth check only for those functions with more than 1 arg required
        const enableFourthCheck = nArgs.filter(({ optional }) => !optional).length > 1;
        if (enableFourthCheck) {
          formulas.push(`${fn}(1)`);
        }
        formulas.forEach((formula, i) => {
          expect(
            formulaOperation.getErrorMessage!(
              getNewLayerWithFormula(formula),
              'col1',
              indexPattern,
              operationDefinitionMap
            )
          ).toEqual([errors[i](fn)]);
        });
      });
    }

    it('returns error if formula filter has not same type of inner operations filter', () => {
      const formulas = [
        { formula: `count(kql='bytes > 4000')`, operation: 'count' },
        {
          formula: `count(lucene='bytes:[400 TO *]') + sum(bytes, kql='bytes > 4000')`,
          operation: 'sum',
        },
        {
          formula: `moving_average(average(bytes), kql='bytes: *', window=7)`,
          operation: 'moving_average',
        },
        { formula: `moving_average(sum(bytes, kql='bytes: *'), window=7)`, operation: 'sum' },
      ];

      for (const { formula, operation } of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula, true, {
              filter: { language: 'lucene', query: 'bytes:[400 TO *]' },
            }),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual([
          `The Formula filter of type "lucene" is not compatible with the inner filter of type "kql" from the ${operation} operation.`,
        ]);
      }
    });

    it('return multiple errors if formula filter has not same type of multiple inner operations filter', () => {
      expect(
        formulaOperation.getErrorMessage!(
          getNewLayerWithFormula(
            `count(kql='bytes > 4000') + sum(bytes, kql='bytes > 4000')`,
            true,
            {
              filter: { language: 'lucene', query: 'bytes:[400 TO *]' },
            }
          ),
          'col1',
          indexPattern,
          operationDefinitionMap
        )
      ).toEqual([
        `The Formula filter of type "lucene" is not compatible with the inner filter of type "kql" from the count operation.`,
        `The Formula filter of type "lucene" is not compatible with the inner filter of type "kql" from the sum operation.`,
      ]);
    });

    it('returns no error if formula filter and operation inner filters are compatible', () => {
      const formulas = [
        `count(kql='bytes > 4000')`,
        `count(kql='bytes > 4000') + sum(bytes, kql='bytes > 4000')`,
        `moving_average(average(bytes), kql='bytes: *', window=7)`,
        `moving_average(sum(bytes, kql='bytes: *'), window=7)`,
      ];

      for (const formula of formulas) {
        expect(
          formulaOperation.getErrorMessage!(
            getNewLayerWithFormula(formula, true, {
              filter: { language: 'kuery', query: 'bytes > 4000' },
            }),
            'col1',
            indexPattern,
            operationDefinitionMap
          )
        ).toEqual(undefined);
      }
    });
  });
});
