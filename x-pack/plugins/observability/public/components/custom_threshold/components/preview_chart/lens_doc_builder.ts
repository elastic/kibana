/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator } from '../../../../../common/custom_threshold_rule/types';
import { scaffoldingLensDoc } from './constants';
import { AddLensDataLayer, AddLensReferenceLayer, LensDoc, Fill } from './types';

class LensDocBuilder {
  private readonly lensDoc: LensDoc;
  private readonly prefixReferenceName = 'indexpattern-datasource-layer-';

  constructor() {
    this.lensDoc = scaffoldingLensDoc;
  }
  private _getAnnotationDirection = (comparator: Comparator) => {
    if (comparator === Comparator.GT || comparator === Comparator.GT_OR_EQ) return Fill.ABOVE;
    if (comparator === Comparator.LT || comparator === Comparator.LT_OR_EQ) return Fill.BELOW;
    return Fill.NONE;
  };

  private _addReference({ dataViewId, layerId }: { dataViewId: string; layerId: string }) {
    this.lensDoc.references.push({
      type: 'index-pattern',
      id: dataViewId,
      name: `${this.prefixReferenceName}${layerId}`,
    });
  }

  private _removeLayer(layerId: string) {
    this.lensDoc.references = this.lensDoc.references.filter(
      (ref) => ref.name !== `${this.prefixReferenceName}${layerId}`
    );
    this.lensDoc.state.visualization.layers = this.lensDoc.state.visualization.layers.filter(
      (layer) => layer.layerId !== layerId
    );
    if (this.lensDoc.state.datasourceStates.formBased.layers.hasOwnProperty(layerId)) {
      delete this.lensDoc.state.datasourceStates.formBased.layers[layerId];
    }
  }
  addQueryFilter(query?: string) {
    this.lensDoc.state.query.query = query || '';
    return this;
  }

  addDataLayer({
    layerId,
    accessors,
    xAccessor,
    dataViewId,
    operationType,
    sourceField,
    label,
    groupBy,
  }: AddLensDataLayer): this {
    this._removeLayer(layerId);
    this._addReference({ dataViewId, layerId });
    this.lensDoc.state.visualization.layers.push({
      layerId,
      accessors: [accessors],
      position: 'top',
      seriesType: 'bar',
      showGridlines: false,
      layerType: 'data',
      colorMapping: {
        assignmentMode: 'auto',
        assignments: [],
        specialAssignments: [
          {
            rule: {
              type: 'other',
            },
            color: {
              type: 'categorical',
              paletteId: 'neutral',
              colorIndex: 1,
            },
            touched: false,
          },
        ],
        paletteId: 'eui_amsterdam_color_blind',
        colorMode: {
          type: 'categorical',
        },
      },
      xAccessor,
    });

    this.lensDoc.state.datasourceStates.formBased.layers[layerId] = {
      columns: {
        [xAccessor]: {
          label: '@timestamp',
          dataType: 'date',
          operationType: 'date_histogram',
          sourceField: '@timestamp',
          isBucketed: true,
          scale: 'interval',
          params: {
            interval: 'auto',
            includeEmptyRows: true,
            dropPartials: false,
          },
        },
        [accessors]: {
          label,
          dataType: 'number',
          operationType,
          sourceField,
          isBucketed: false,
          scale: 'ratio',
          params: {
            emptyAsNull: true,
          },
        },
      },
      columnOrder: [xAccessor, accessors],
      sampling: 1,
      ignoreGlobalFilters: false,
      incompleteColumns: {},
    };
    if (groupBy && groupBy.length >= 1) {
      const xAccessorGroupBy = xAccessor + '-groupBy';
      this.lensDoc.state.datasourceStates.formBased.layers[layerId].columns[xAccessorGroupBy] = {
        label: `Top values of ${groupBy.toLocaleString()}`,
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: groupBy[0],
        isBucketed: true,
        params: {
          size: 3,
          orderBy: {
            type: 'alphabetical',
            fallback: true,
          },
          orderDirection: 'asc',
          otherBucket: true,
          missingBucket: false,
          parentFormat: {
            id: 'multi_terms',
          },
          secondaryFields: groupBy.slice(1),
          accuracyMode: false,
        },
      };
      this.lensDoc.state.datasourceStates.formBased.layers[layerId].columnOrder.unshift(
        xAccessorGroupBy
      );
      this.lensDoc.state.visualization.layers.forEach((layer) => {
        if (layer.layerId === layerId) {
          layer.splitAccessor = xAccessorGroupBy;
        }
      });
    }
    return this;
  }

  addReferenceLayer({
    dataViewId,
    layerId,
    accessors,
    label,
    comparator,
    value,
    color,
    lineWidth,
  }: AddLensReferenceLayer) {
    this._removeLayer(layerId);
    this._addReference({ dataViewId, layerId });
    this.lensDoc.state.visualization.layers.push({
      layerId,
      layerType: 'referenceLine',
      accessors: [accessors],
      yConfig: [
        {
          forAccessor: accessors,
          axisMode: 'left',
          color: color || '#e80000',
          lineWidth: lineWidth || 3,
          fill: this._getAnnotationDirection(comparator),
        },
      ],
    });
    this.lensDoc.state.datasourceStates.formBased.layers[layerId] = {
      linkToLayers: [],
      columns: {
        [accessors]: {
          label,
          dataType: 'number',
          operationType: 'static_value',
          isStaticValue: true,
          isBucketed: false,
          scale: 'ratio',
          params: {
            value,
          },
          customLabel: true,
        },
      },
      columnOrder: [accessors],
      sampling: 1,
      ignoreGlobalFilters: false,
      incompleteColumns: {},
    };
    return this;
  }
  getAttributes() {
    return JSON.parse(JSON.stringify(this.lensDoc));
  }
}

// eslint-disable-next-line import/no-default-export
export default LensDocBuilder;
