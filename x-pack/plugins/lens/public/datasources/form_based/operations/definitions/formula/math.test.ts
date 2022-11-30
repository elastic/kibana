/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TinymathAST } from '@kbn/tinymath';
import { IndexPattern } from '../../../../../types';
import { FormBasedLayer } from '../../../types';
import { MathIndexPatternColumn, mathOperation } from './math';

function createLayerWithMathColumn(tinymathAst: string | TinymathAST): FormBasedLayer {
  return {
    columnOrder: ['myColumnId'],
    columns: {
      myColumnId: {
        label: 'Math',
        dataType: 'number',
        operationType: 'math',
        isBucketed: false,
        scale: 'ratio',
        params: {
          tinymathAst,
        },
        references: [],
      } as MathIndexPatternColumn,
    },
    // Each layer is tied to the index pattern that created it
    indexPatternId: 'myIndexPattern',
  };
}

describe('math operation', () => {
  describe('toExpression / formula rewrite', () => {
    it('should use primitive signs rather than function names for the 4 basic operations', () => {
      const tinymathAst = {
        type: 'function',
        name: 'add',
        args: [
          {
            type: 'function',
            name: 'add',
            args: [
              {
                type: 'function',
                name: 'add',
                args: [
                  {
                    type: 'function',
                    name: 'add',
                    args: [
                      {
                        type: 'function',
                        name: 'add',
                        args: [
                          {
                            type: 'function',
                            name: 'add',
                            args: [
                              {
                                type: 'function',
                                name: 'add',
                                args: [
                                  {
                                    type: 'function',
                                    name: 'add',
                                    args: [
                                      {
                                        type: 'function',
                                        name: 'add',
                                        args: [
                                          {
                                            type: 'function',
                                            name: 'add',
                                            args: [
                                              {
                                                type: 'function',
                                                name: 'add',
                                                args: [
                                                  {
                                                    type: 'function',
                                                    name: 'add',
                                                    args: [
                                                      {
                                                        type: 'function',
                                                        name: 'add',
                                                        args: [
                                                          {
                                                            type: 'function',
                                                            name: 'add',
                                                            args: [
                                                              {
                                                                type: 'function',
                                                                name: 'add',
                                                                args: [
                                                                  {
                                                                    type: 'function',
                                                                    name: 'add',
                                                                    args: ['columnX0', 'columnX1'],
                                                                  },
                                                                  'columnX2',
                                                                ],
                                                              },
                                                              'columnX3',
                                                            ],
                                                          },
                                                          'columnX4',
                                                        ],
                                                      },
                                                      'columnX5',
                                                    ],
                                                  },
                                                  'columnX6',
                                                ],
                                              },
                                              'columnX7',
                                            ],
                                          },
                                          'columnX8',
                                        ],
                                      },
                                      'columnX9',
                                    ],
                                  },
                                  'columnX10',
                                ],
                              },
                              'columnX11',
                            ],
                          },
                          'columnX12',
                        ],
                      },
                      'columnX13',
                    ],
                  },
                  'columnX14',
                ],
              },
              'columnX15',
            ],
          },
          'columnX16',
        ],
        location: {
          min: 0,
          max: 218,
        },
        text: 'sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes) + sum(bytes)',
      } as unknown as TinymathAST;

      const expression = mathOperation.toExpression(
        createLayerWithMathColumn(tinymathAst),
        'myColumnId',
        {} as IndexPattern
      );

      expect(expression).toEqual([
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: ['myColumnId'],
            name: ['Math'],
            castColumns: [],
            expression: [
              '(((((((((((((((("columnX0" + "columnX1") + "columnX2") + "columnX3") + "columnX4") + "columnX5") + "columnX6") + "columnX7") + "columnX8") + "columnX9") + "columnX10") + "columnX11") + "columnX12") + "columnX13") + "columnX14") + "columnX15") + "columnX16")',
            ],
            onError: ['null'],
          },
        },
      ]);
    });

    it('should preserve grouping when rewriting the formula', () => {
      const tinymathAst = {
        type: 'function',
        name: 'add',
        args: [
          'columnX0',
          {
            type: 'function',
            name: 'divide',
            args: [
              {
                type: 'function',
                name: 'subtract',
                args: ['columnX1', 'columnX2'],
                location: {
                  min: 14,
                  max: 37,
                },
                text: 'sum(bytes) - sum(bytes)',
              },
              {
                type: 'function',
                name: 'subtract',
                args: [
                  'columnX3',
                  {
                    type: 'function',
                    name: 'multiply',
                    args: ['columnX4', 'columnX5'],
                    location: {
                      min: 54,
                      max: 78,
                    },
                    text: ' sum(bytes) * sum(bytes)',
                  },
                ],
                location: {
                  min: 42,
                  max: 78,
                },
                text: 'sum(bytes) - sum(bytes) * sum(bytes)',
              },
            ],
            location: {
              min: 12,
              max: 79,
            },
            text: ' (sum(bytes) - sum(bytes)) / (sum(bytes) - sum(bytes) * sum(bytes))',
          },
        ],
        location: {
          min: 0,
          max: 79,
        },
        // Explicit grouping here
        text: 'sum(bytes) + (sum(bytes) - sum(bytes)) / (sum(bytes) - sum(bytes) * sum(bytes))',
      } as unknown as TinymathAST;

      const expression = mathOperation.toExpression(
        createLayerWithMathColumn(tinymathAst),
        'myColumnId',
        {} as IndexPattern
      );

      expect(expression).toEqual([
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: ['myColumnId'],
            name: ['Math'],
            castColumns: [],
            expression: [
              `("columnX0" + (("columnX1" - "columnX2") / ("columnX3" - ("columnX4" * "columnX5"))))`,
            ],
            onError: ['null'],
          },
        },
      ]);
    });

    it('should keep not optimizable functions as is', () => {
      const tinymathAst = {
        type: 'function',
        name: 'pick_max',
        args: [
          {
            type: 'function',
            name: 'pick_min',
            args: ['columnX0', 'columnX1'],
            location: {
              min: 9,
              max: 41,
            },
            text: 'pick_min(sum(bytes), sum(bytes))',
          },
          {
            type: 'function',
            name: 'abs',
            args: ['columnX2'],
            location: {
              min: 43,
              max: 58,
            },
            text: 'abs(sum(bytes))',
          },
        ],
        location: {
          min: 0,
          max: 59,
        },
        text: 'pick_max(pick_min(sum(bytes), sum(bytes)), abs(sum(bytes)))',
      } as unknown as TinymathAST;

      const expression = mathOperation.toExpression(
        createLayerWithMathColumn(tinymathAst),
        'myColumnId',
        {} as IndexPattern
      );

      expect(expression).toEqual([
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: ['myColumnId'],
            name: ['Math'],
            castColumns: [],
            expression: [`max(min("columnX0","columnX1"),abs("columnX2"))`],
            onError: ['null'],
          },
        },
      ]);
    });

    it('should work with literals', () => {
      const tinymathAst = {
        type: 'function',
        name: 'add',
        args: [
          5,
          {
            type: 'function',
            name: 'divide',
            args: [3, 8],
            location: {
              min: 3,
              max: 9,
            },
            text: ' 3 / 8',
          },
        ],
        location: {
          min: 0,
          max: 9,
        },
        text: '5 + 3 / 8',
      } as TinymathAST;

      const expression = mathOperation.toExpression(
        createLayerWithMathColumn(tinymathAst),
        'myColumnId',
        {} as IndexPattern
      );

      expect(expression).toEqual([
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: ['myColumnId'],
            name: ['Math'],
            castColumns: [],
            expression: [`(5 + (3 / 8))`],
            onError: ['null'],
          },
        },
      ]);
    });

    it('should work for comparison operations as well', () => {
      const tinymathAst = {
        type: 'function',
        name: 'ifelse',
        args: [
          {
            type: 'function',
            name: 'eq',
            args: ['columnX0', 0],
          },
          {
            type: 'function',
            name: 'ifelse',
            args: [
              {
                type: 'function',
                name: 'lt',
                args: ['columnX1', 0],
              },
              {
                type: 'function',
                name: 'ifelse',
                args: [
                  {
                    type: 'function',
                    name: 'lte',
                    args: ['columnX2', 0],
                  },
                  'columnX3',
                  'columnX4',
                ],
              },
              'columnX5',
            ],
          },
          {
            type: 'function',
            name: 'ifelse',
            args: [
              {
                type: 'function',
                name: 'gt',
                args: ['columnX6', 0],
              },
              {
                type: 'function',
                name: 'ifelse',
                args: [
                  {
                    type: 'function',
                    name: 'gte',
                    args: ['columnX7', 0],
                  },
                  'columnX8',
                  'columnX9',
                ],
              },
              'columnX10',
            ],
          },
        ],
      } as unknown as TinymathAST;

      const expression = mathOperation.toExpression(
        createLayerWithMathColumn(tinymathAst),
        'myColumnId',
        {} as IndexPattern
      );

      expect(expression).toEqual([
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: ['myColumnId'],
            name: ['Math'],
            castColumns: [],
            expression: [
              'ifelse(("columnX0" == 0),ifelse(("columnX1" < 0),ifelse(("columnX2" <= 0),"columnX3","columnX4"),"columnX5"),ifelse(("columnX6" > 0),ifelse(("columnX7" >= 0),"columnX8","columnX9"),"columnX10"))',
            ],
            onError: ['null'],
          },
        },
      ]);
    });
  });
});
