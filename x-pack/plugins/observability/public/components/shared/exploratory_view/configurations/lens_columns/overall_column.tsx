/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TinymathAST } from '@kbn/tinymath';
import {
  DataType,
  CountIndexPatternColumn,
  MathIndexPatternColumn,
  FormulaIndexPatternColumn,
  OverallSumIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { RECORDS_FIELD } from '../constants';

export function getDistributionInPercentageColumn({
  label,
  layerId,
  columnFilter,
}: {
  label?: string;
  columnFilter?: string;
  layerId: string;
}) {
  const yAxisColId = `y-axis-column-${layerId}`;

  let lensFormula = 'count() / overall_sum(count())';

  if (columnFilter) {
    lensFormula = `count(kql='${columnFilter}') / overall_sum(count(kql='${columnFilter}'))`;
  }

  const main: FormulaIndexPatternColumn = {
    label: label || 'Percentage of records',
    dataType: 'number' as DataType,
    operationType: 'formula',
    isBucketed: false,
    scale: 'ratio',
    params: {
      formula: lensFormula,
      isFormulaBroken: false,
      format: { id: 'percent', params: { decimals: 0 } },
    },
    references: [`${yAxisColId}X4`],
  };

  const countColumn: CountIndexPatternColumn = {
    label: 'Part of count() / overall_sum(count())',
    dataType: 'number',
    operationType: 'count',
    isBucketed: false,
    scale: 'ratio',
    sourceField: RECORDS_FIELD,
    customLabel: true,
    filter: { query: columnFilter ?? '', language: 'kuery' },
  };

  const mathColumn: MathIndexPatternColumn = {
    label: 'Part of count() / overall_sum(count())',
    dataType: 'number',
    operationType: 'math',
    isBucketed: false,
    scale: 'ratio',
    params: { tinymathAst: `${yAxisColId}X1` },
    references: [`${yAxisColId}X1`],
    customLabel: true,
  };

  const overAllSumColumn: OverallSumIndexPatternColumn = {
    label: 'Part of count() / overall_sum(count())',
    dataType: 'number',
    operationType: 'overall_sum',
    isBucketed: false,
    scale: 'ratio',
    references: [`${yAxisColId}X2`],
    customLabel: true,
  };

  const tinyMathColumn: MathIndexPatternColumn = {
    label: 'Part of count() / overall_sum(count())',
    dataType: 'number',
    operationType: 'math',
    isBucketed: false,
    scale: 'ratio',
    params: {
      tinymathAst: {
        type: 'function',
        name: 'divide',
        args: [`${yAxisColId}X0`, `${yAxisColId}X3`],
        location: { min: 0, max: 30 },
        text: lensFormula,
      } as unknown as TinymathAST,
    },
    references: [`${yAxisColId}X0`, `${yAxisColId}X3`],
    customLabel: true,
  };

  const supportingColumns: Record<
    string,
    CountIndexPatternColumn | MathIndexPatternColumn | OverallSumIndexPatternColumn
  > = {
    [`${yAxisColId}X0`]: countColumn,
    [`${yAxisColId}X1`]: countColumn,
    [`${yAxisColId}X2`]: mathColumn,
    [`${yAxisColId}X3`]: overAllSumColumn,
    [`${yAxisColId}X4`]: tinyMathColumn,
  };

  return { main, supportingColumns };
}
