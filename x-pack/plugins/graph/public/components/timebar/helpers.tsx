/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';

import { i18n } from '@kbn/i18n';
import { SavedObjectReference } from '@kbn/core/public';
import type {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYAnnotationLayerConfig,
  XYState,
} from '@kbn/lens-plugin/public';
import { TimeRange, Workspace, WorkspaceEdge } from '../../types/workspace_state';

// Based on default Lens palette
export const MAIN_COLOR = '#54B399';
export const SELECTION_COLOR = '#9170B8';

function escapeString(string: string) {
  return string.replace(/'/g, `\\'`);
}

export function buildQueryFilters(edges: WorkspaceEdge[]): Record<string, unknown> {
  return {
    bool: {
      // avoid self links
      should: edges
        .filter(
          ({ source, target }) =>
            source.data.term !== target.data.term && source.data.field !== target.data.field
        )
        .map(({ source, target }) => ({
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        [source.data.field]: source.data.term,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        [target.data.field]: target.data.term,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        })),
    },
  };
}

function getKqlQuery(edges: WorkspaceEdge[]) {
  // workout the KQL query from the list of edges displayed
  const tuples = [];
  for (const edge of edges) {
    if (
      edge.source.data.term !== edge.target.data.term &&
      edge.source.data.field !== edge.target.data.field
    ) {
      tuples.push([edge.source.data, edge.target.data]);
    }
  }
  // remove duplicates
  const sets = new Set(
    tuples.map(([source, target]) => {
      return `(${escapeString(source.field)}: "${escapeString(source.term)}" AND ${escapeString(
        target.field
      )}: "${escapeString(target.term)}")`;
    })
  );
  return [...sets].join(' OR ');
}

function getBaseLayer(dataView: DataView): PersistedIndexPatternLayer {
  return {
    columnOrder: ['col1'],
    columns: {
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: dataView.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
    },
  };
}

export function getLensAttributes(
  workspace: Workspace,
  dataView: DataView,
  formula: FormulaPublicApi,
  {
    timeFilter,
    playTimeFilter,
  }: { timeFilter: TimeRange | undefined; playTimeFilter: TimeRange | undefined }
): TypedLensByValueInput['attributes'] {
  const dataLayers: Record<string, PersistedIndexPatternLayer> = {
    layer1: formula.insertOrReplaceFormulaColumn(
      'col2',
      {
        formula: `count(kql='${getKqlQuery(workspace.edges)}')`,
        label: i18n.translate('xpack.graph.leaveWorkspace.edges', {
          defaultMessage: 'Edges traffic',
        }),
      },
      getBaseLayer(dataView),
      dataView
    )!,
  };

  const layers: XYState['layers'] = [
    {
      accessors: ['col2'],
      layerId: 'layer1',
      layerType: 'data',
      seriesType: 'bar',
      xAccessor: 'col1',
    },
  ];

  if (workspace.getEdgeSelection().length) {
    const edges = workspace.getEdgeSelection();
    dataLayers.layer2 = formula.insertOrReplaceFormulaColumn(
      'col3',
      {
        formula: `count(kql='${getKqlQuery(edges)}')`,
        label: i18n.translate('xpack.graph.leaveWorkspace.edgesSelected', {
          defaultMessage:
            '{selection, plural, one {Edge} other {Edges}} selected {selection, plural, one {} other { ({selection}) }}',
          values: {
            selection: edges.length,
          },
        }),
      },
      getBaseLayer(dataView),
      dataView
    )!;

    layers.push({
      accessors: ['col3'],
      layerId: 'layer2',
      layerType: 'data',
      seriesType: 'line',
      xAccessor: 'col1',
      yConfig: [{ forAccessor: 'col3', axisMode: 'right', color: SELECTION_COLOR }],
    });
  }

  if (timeFilter || playTimeFilter) {
    const layer = {
      layerId: 'layer3',
      layerType: 'annotations',
      annotations: [],
    } as XYAnnotationLayerConfig;
    layers.push(layer);

    if (timeFilter) {
      layer.annotations.push({
        label: 'User selection range',
        key: {
          type: 'range',
          timestamp: timeFilter.from,
          endTimestamp: timeFilter.to,
        },
        id: 'layer3-timebar',
        color: '#7B7B7B1A',
      });
    }
  }

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers,
    legend: { isVisible: false, position: 'top' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: '', // TODO: replace with colored wrapped title
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      workspace.getEdgeSelection().length
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer2',
            type: 'index-pattern',
          }
        : null,
      timeFilter
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer3',
            type: 'index-pattern',
          }
        : null,
      playTimeFilter
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer4',
            type: 'index-pattern',
          }
        : null,
    ].filter(Boolean) as SavedObjectReference[],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: dataLayers,
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}
