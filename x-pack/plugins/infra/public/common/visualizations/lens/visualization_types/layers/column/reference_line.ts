/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { ReferenceBasedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';
import type { FormulaConfig, ChartColumn } from '../../../../types';

export class ReferenceLineColumn implements ChartColumn {
  constructor(private formulaConfig: FormulaConfig) {}

  getFormulaConfig(): FormulaConfig {
    return this.formulaConfig;
  }

  getData(id: string, baseLayer: PersistedIndexPatternLayer): PersistedIndexPatternLayer {
    const { label, ...params } = this.getFormulaConfig();
    return {
      linkToLayers: [],
      columnOrder: [...baseLayer.columnOrder, id],
      columns: {
        [id]: {
          label: label ?? 'Reference',
          dataType: 'number',
          operationType: 'static_value',
          isStaticValue: true,
          isBucketed: false,
          scale: 'ratio',
          params,
          references: [],
          customLabel: true,
        } as ReferenceBasedIndexPatternColumn,
      },
      sampling: 1,
      incompleteColumns: {},
    };
  }
}
