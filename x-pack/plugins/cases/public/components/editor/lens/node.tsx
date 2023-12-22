/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import type { EditorConfig, LexicalEditor, LexicalNode } from 'lexical';
import { LensRenderer } from '../../visualizations/lens_renderer';

const attributes = {
  title: '',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [
    {
      type: 'index-pattern',
      id: '390329a2-e67a-43b7-9c2b-72089a06b259',
      name: 'indexpattern-datasource-layer-36d070f1-6db5-4925-9352-738f5eaa1da9',
    },
  ],
  state: {
    visualization: {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: '36d070f1-6db5-4925-9352-738f5eaa1da9',
          accessors: ['d47f5950-9fee-480f-920b-9e1dcb8a2534'],
          position: 'top',
          seriesType: 'bar_stacked',
          showGridlines: false,
          layerType: 'data',
          xAccessor: '5f3a0416-007e-49ab-835c-e79ab9f1fa5a',
        },
      ],
    },
    query: { query: '', language: 'kuery' },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '36d070f1-6db5-4925-9352-738f5eaa1da9': {
            columns: {
              '5f3a0416-007e-49ab-835c-e79ab9f1fa5a': {
                label: 'cases.created_at',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: 'cases.created_at',
                isBucketed: true,
                scale: 'interval',
                params: { interval: 'auto', includeEmptyRows: true, dropPartials: false },
              },
              'd47f5950-9fee-480f-920b-9e1dcb8a2534': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                params: { emptyAsNull: true },
              },
            },
            columnOrder: [
              '5f3a0416-007e-49ab-835c-e79ab9f1fa5a',
              'd47f5950-9fee-480f-920b-9e1dcb8a2534',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      indexpattern: { layers: {} },
      textBased: { layers: {} },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
};

const timeRange = {
  from: 'now-1y/d',
  to: 'now',
  mode: 'relative',
};

export class LensNode extends DecoratorBlockNode {
  static getType(): string {
    return 'lens';
  }

  static clone(node: LensNode): LensNode {
    return new LensNode();
  }

  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    // @ts-expect-error
    return <LensRenderer attributes={attributes} timeRange={timeRange} />;
  }
}

export function $createLensNode(): LensNode {
  return new LensNode();
}

export function $isLensNode(node: LensNode | LexicalNode | null | undefined): node is LensNode {
  return node instanceof LensNode;
}
