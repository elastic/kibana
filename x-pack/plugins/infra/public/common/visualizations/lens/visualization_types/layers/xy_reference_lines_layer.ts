/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core-saved-objects-common';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  XYReferenceLineLayerConfig,
} from '@kbn/lens-plugin/public';
import { ChartColumn, ChartLayer, FormulaConfig } from '../../../types';
import { getDefaultReferences } from '../../utils';
import { ReferenceLineColumn } from './column/reference_line';

interface XYReferenceLinesLayerConfig {
  data: FormulaConfig[];
}

export class XYReferenceLinesLayer implements ChartLayer<XYReferenceLineLayerConfig> {
  private column: ChartColumn[];
  constructor(layerConfig: XYReferenceLinesLayerConfig) {
    this.column = layerConfig.data.map((p) => new ReferenceLineColumn(p));
  }

  getName(): string {
    return this.column[0].getName();
  }

  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView
  ): FormBasedPersistedState['layers'] {
    const baseLayer = { columnOrder: [], columns: {} } as PersistedIndexPatternLayer;
    return {
      [`${layerId}_reference`]: this.column.reduce((acc, curr, index) => {
        return {
          ...acc,
          ...curr.getData(`${accessorId}_${index}_reference_column`, dataView, acc),
        };
      }, baseLayer),
    };
  }

  getReference(layerId: string, dataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(dataView, `${layerId}_reference`);
  }

  getLayerConfig(layerId: string, accessorId: string): XYReferenceLineLayerConfig {
    return {
      layerId: `${layerId}_reference`,
      layerType: 'referenceLine',
      accessors: this.column.map((_, index) => `${accessorId}_${index}_reference_column`),
      yConfig: this.column.map((layer, index) => ({
        color: layer.getFormulaConfig().color,
        forAccessor: `${accessorId}_${index}_reference_column`,
        axisMode: 'left',
      })),
    };
  }
}
