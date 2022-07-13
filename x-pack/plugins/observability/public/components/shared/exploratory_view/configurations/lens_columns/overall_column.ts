/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormulaIndexPatternColumn, FormulaPublicApi } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';

export function getDistributionInPercentageColumn({
  label,
  layerId,
  dataView,
  columnFilter,
  lensFormulaHelper,
  formula,
}: {
  label?: string;
  columnFilter?: string;
  layerId: string;
  lensFormulaHelper: FormulaPublicApi;
  dataView: DataView;
  formula?: string;
}) {
  const yAxisColId = `y-axis-column-${layerId}`;

  let lensFormula = formula ?? 'count() / overall_sum(count())';

  if (columnFilter) {
    lensFormula =
      formula ?? `count(kql='${columnFilter}') / overall_sum(count(kql='${columnFilter}'))`;
  }

  const { columns } = lensFormulaHelper?.insertOrReplaceFormulaColumn(
    yAxisColId,
    {
      formula: lensFormula,
      label,
      format: {
        id: 'percent',
        params: {
          decimals: 0,
        },
      },
    },
    {
      columns: {},
      columnOrder: [],
    },
    dataView
  ) ?? { columns: {} };

  const { [yAxisColId]: main, ...supportingColumns } = columns;

  return { main: columns[yAxisColId] as FormulaIndexPatternColumn, supportingColumns };
}
