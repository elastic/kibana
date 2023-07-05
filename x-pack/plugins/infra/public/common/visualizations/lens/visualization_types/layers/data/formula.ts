/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormulaPublicApi, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Formula, ChartData, FormulaValue, LayerValue, ValueParameters } from '../../../../types';

export class FormulaData implements ChartData {
  constructor(
    private formulaAPI: FormulaPublicApi,
    private config: LayerValue<FormulaValue>,
    private params?: ValueParameters
  ) {}

  getName() {
    return this.params?.label ?? this.config.name;
  }

  getFormula(): Formula {
    const { data } = this.config;

    const { decimals = data.format?.params?.decimals } = this.params?.format ?? {};

    return {
      formula: data.value,
      ...(data.format && decimals
        ? {
            format: {
              ...data.format,
              params: {
                decimals,
              },
            },
          }
        : {}),
      label: this.getName(),
    };
  }

  getLayer(id: string, dataView: DataView, baseLayer: PersistedIndexPatternLayer) {
    const formulaLayer = this.formulaAPI.insertOrReplaceFormulaColumn(
      id,
      this.getFormula(),
      baseLayer,
      dataView
    );

    if (!formulaLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return formulaLayer;
  }
}
