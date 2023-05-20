/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import type { EditorConfig, LexicalEditor, LexicalNode } from 'lexical';
import { LensMarkDownRenderer } from '../../markdown_editor/plugins/lens/processor';

const attributes = {
  title: '',
  description: '',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-9b9eddff-5318-4a47-805d-7c70b4ad1404',
    },
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-43637802-434b-4113-9640-895be76a9a52',
    },
  ],
  state: {
    visualization: {
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      fittingFunction: 'None',
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: '9b9eddff-5318-4a47-805d-7c70b4ad1404',
          accessors: ['068d0d3a-11f7-4376-bbd5-6dda52bd573a'],
          position: 'top',
          seriesType: 'bar_stacked',
          showGridlines: false,
          layerType: 'data',
          xAccessor: '0dcd0341-1043-429d-bbf4-8d56fbb05a0b',
        },
        {
          layerId: '43637802-434b-4113-9640-895be76a9a52',
          seriesType: 'bar_stacked',
          xAccessor: '280c85e7-806b-4242-aa3a-ec53c38a35e9',
          accessors: ['4520e1e8-b45a-443d-bfad-692a3f9bf10b'],
          layerType: 'data',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '9b9eddff-5318-4a47-805d-7c70b4ad1404': {
            columns: {
              '0dcd0341-1043-429d-bbf4-8d56fbb05a0b': {
                label: 'Top 5 values of host.name',
                dataType: 'string',
                operationType: 'terms',
                scale: 'ordinal',
                sourceField: 'host.name',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '068d0d3a-11f7-4376-bbd5-6dda52bd573a',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
              },
              '068d0d3a-11f7-4376-bbd5-6dda52bd573a': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '0dcd0341-1043-429d-bbf4-8d56fbb05a0b',
              '068d0d3a-11f7-4376-bbd5-6dda52bd573a',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
          '43637802-434b-4113-9640-895be76a9a52': {
            columns: {
              '280c85e7-806b-4242-aa3a-ec53c38a35e9': {
                label: 'Top 5 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                scale: 'ordinal',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '4520e1e8-b45a-443d-bfad-692a3f9bf10b',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
              },
              '4520e1e8-b45a-443d-bfad-692a3f9bf10b': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '280c85e7-806b-4242-aa3a-ec53c38a35e9',
              '4520e1e8-b45a-443d-bfad-692a3f9bf10b',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      textBased: {
        layers: {},
      },
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
    return <LensMarkDownRenderer attributes={attributes} timeRange={timeRange} />;
  }
}

export function $createLensNode(): LensNode {
  return new LensNode();
}

export function $isLensNode(node: LensNode | LexicalNode | null | undefined): node is LensNode {
  return node instanceof LensNode;
}
