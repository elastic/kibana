/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { Ast } from '@kbn/interpreter';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry, CUSTOM_PALETTE } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { IconChartDatatable } from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import type {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  DatasourceLayers,
  Suggestion,
} from '../../types';
import { TableDimensionDataExtraEditor, TableDimensionEditor } from './components/dimension_editor';
import { TableDimensionEditorAdditionalSection } from './components/dimension_editor_addtional_section';
import type { LayerType } from '../../../common/types';
import { getDefaultSummaryLabel } from '../../../common/expressions/datatable/summary';
import type {
  ColumnState,
  SortingState,
  PagingState,
  CollapseExpressionFunction,
  DatatableColumnFunction,
  DatatableExpressionFunction,
} from '../../../common/expressions';
import { DataTableToolbar } from './components/toolbar';

export interface DatatableVisualizationState {
  columns: ColumnState[];
  layerId: string;
  layerType: LayerType;
  sorting?: SortingState;
  rowHeight?: 'auto' | 'single' | 'custom';
  headerRowHeight?: 'auto' | 'single' | 'custom';
  rowHeightLines?: number;
  headerRowHeightLines?: number;
  paging?: PagingState;
}

const visualizationLabel = i18n.translate('xpack.lens.datatable.label', {
  defaultMessage: 'Table',
});

export const getDatatableVisualization = ({
  paletteService,
  theme,
}: {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
}): Visualization<DatatableVisualizationState> => ({
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: IconChartDatatable,
      label: visualizationLabel,
      groupLabel: i18n.translate('xpack.lens.datatable.groupLabel', {
        defaultMessage: 'Tabular',
      }),
      sortPriority: 5,
    },
  ],

  getVisualizationTypeId() {
    return 'lnsDatatable';
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  clearLayer(state) {
    return {
      ...state,
      columns: [],
    };
  },

  getDescription() {
    return {
      icon: IconChartDatatable,
      label: visualizationLabel,
    };
  },

  switchVisualizationType: (_, state) => state,

  triggers: [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick],

  initialize(addNewLayer, state) {
    return (
      state || {
        columns: [],
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
      }
    );
  },

  getSuggestions({
    table,
    state,
    keptLayerIds,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged') ||
      table.columns.some((col) => col.operation.isStaticValue)
    ) {
      return [];
    }
    const oldColumnSettings: Record<string, ColumnState> = {};
    if (state) {
      state.columns.forEach((column) => {
        oldColumnSettings[column.columnId] = column;
      });
    }
    const lastTransposedColumnIndex = table.columns.findIndex((c) =>
      !oldColumnSettings[c.columnId] ? false : !oldColumnSettings[c.columnId]?.isTransposed
    );
    const usesTransposing = state?.columns.some((c) => c.isTransposed);

    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.datatable.suggestionLabel', {
            defaultMessage: 'As table',
          })
        : i18n.translate('xpack.lens.datatable.visualizationOf', {
            defaultMessage: 'Table {operations}',
            values: {
              operations:
                table.label ||
                table.columns
                  .map((col) => col.operation.label)
                  .join(
                    i18n.translate('xpack.lens.datatable.conjunctionSign', {
                      defaultMessage: ' & ',
                      description:
                        'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                    })
                  ),
            },
          });

    const changeType = table.changeType;
    const changeFactor =
      changeType === 'reduced' || changeType === 'layers'
        ? 0.3
        : changeType === 'unchanged'
        ? 0.5
        : 1;

    return [
      {
        title,
        // table with >= 10 columns will have a score of 0.4, fewer columns reduce score
        score: (Math.min(table.columns.length, 10) / 10) * 0.4 * changeFactor,
        state: {
          ...(state || {}),
          layerId: table.layerId,
          layerType: LayerTypes.DATA,
          columns: table.columns.map((col, columnIndex) => ({
            ...(oldColumnSettings[col.columnId] || {}),
            isTransposed: usesTransposing && columnIndex < lastTransposedColumnIndex,
            columnId: col.columnId,
          })),
        },
        previewIcon: IconChartDatatable,
        // tables are hidden from suggestion bar, but used for drag & drop and chart switching
        hide: true,
      },
    ];
  },

  getConfiguration({ state, frame, layerId }) {
    const { sortedColumns, datasource } =
      getDataSourceAndSortedColumns(state, frame.datasourceLayers, layerId) || {};

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

    if (!sortedColumns) {
      return { groups: [] };
    }

    return {
      groups: [
        {
          groupId: 'rows',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownRows', {
            defaultMessage: 'Rows',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.breakdownRow', {
            defaultMessage: 'Row',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownRows.description', {
            defaultMessage:
              'Split table rows by field. This is recommended for high cardinality breakdowns.',
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter(
              (c) =>
                datasource!.getOperationForColumnId(c)?.isBucketed &&
                !state.columns.find((col) => col.columnId === c)?.isTransposed
            )
            .map((accessor) => ({
              columnId: accessor,
              triggerIconType: columnMap[accessor].hidden
                ? 'invisible'
                : columnMap[accessor].collapseFn
                ? 'aggregate'
                : undefined,
            })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_rows',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 1,
        },
        {
          groupId: 'columns',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownColumns', {
            defaultMessage: 'Split metrics by',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.breakdownColumn', {
            defaultMessage: 'Split metrics by',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownColumns.description', {
            defaultMessage:
              "Split metric columns by field. It's recommended to keep the number of columns low to avoid horizontal scrolling.",
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter(
              (c) =>
                datasource!.getOperationForColumnId(c)?.isBucketed &&
                state.columns.find((col) => col.columnId === c)?.isTransposed
            )
            .map((accessor) => ({ columnId: accessor })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_columns',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 0,
        },
        {
          groupId: 'metrics',
          groupLabel: i18n.translate('xpack.lens.datatable.metrics', {
            defaultMessage: 'Metrics',
          }),
          dimensionEditorGroupLabel: i18n.translate('xpack.lens.datatable.metric', {
            defaultMessage: 'Metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.datatable.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed)
            .map((accessor) => {
              const columnConfig = columnMap[accessor];
              const stops = columnConfig?.palette?.params?.stops;
              const hasColoring = Boolean(columnConfig?.colorMode !== 'none' && stops);

              return {
                columnId: accessor,
                triggerIconType: columnConfig?.hidden
                  ? 'invisible'
                  : hasColoring
                  ? 'colorBy'
                  : undefined,
                palette: hasColoring && stops ? stops.map(({ color }) => color) : undefined,
              };
            }),
          supportsMoreColumns: true,
          filterOperations: (op) => !op.isBucketed,
          isMetricDimension: true,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsDatatable_metrics',
          enableDimensionEditor: true,
        },
      ],
    };
  },

  setDimension({ prevState, columnId, groupId, previousColumn }) {
    if (
      prevState.columns.some(
        (column) =>
          column.columnId === columnId || (previousColumn && column.columnId === previousColumn)
      )
    ) {
      return {
        ...prevState,
        columns: prevState.columns.map((column) => {
          if (column.columnId === columnId || column.columnId === previousColumn) {
            return { ...column, columnId, isTransposed: groupId === 'columns' };
          }
          return column;
        }),
      };
    }
    return {
      ...prevState,
      columns: [...prevState.columns, { columnId, isTransposed: groupId === 'columns' }],
    };
  },
  removeDimension({ prevState, columnId }) {
    return {
      ...prevState,
      columns: prevState.columns.filter((column) => column.columnId !== columnId),
      sorting: prevState.sorting?.columnId === columnId ? undefined : prevState.sorting,
    };
  },
  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <TableDimensionEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditorAdditionalSection(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <TableDimensionEditorAdditionalSection {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditorDataExtra(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <TableDimensionDataExtraEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getSupportedLayers() {
    return [
      {
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.datatable.addLayer', {
          defaultMessage: 'Visualization',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression(
    state,
    datasourceLayers,
    { title, description } = {},
    datasourceExpressionsByLayers = {}
  ): Ast | null {
    const { sortedColumns, datasource } =
      getDataSourceAndSortedColumns(state, datasourceLayers, state.layerId) || {};

    if (
      sortedColumns?.length &&
      sortedColumns.filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed).length === 0
    ) {
      return null;
    }

    if (!datasourceExpressionsByLayers || Object.keys(datasourceExpressionsByLayers).length === 0) {
      return null;
    }

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

    const columns = sortedColumns!
      .filter((columnId) => datasource!.getOperationForColumnId(columnId))
      .map((columnId) => columnMap[columnId]);

    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

    const lensCollapseFnAsts = columns
      .filter((c) => c.collapseFn)
      .map((c) =>
        buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
          by: columns
            .filter(
              (col) =>
                col.columnId !== c.columnId &&
                datasource!.getOperationForColumnId(col.columnId)?.isBucketed
            )
            .map((col) => col.columnId),
          metric: columns
            .filter((col) => !datasource!.getOperationForColumnId(col.columnId)?.isBucketed)
            .map((col) => col.columnId),
          fn: [c.collapseFn!],
        }).toAst()
      );

    const datatableFnAst = buildExpressionFunction<DatatableExpressionFunction>('lens_datatable', {
      title: title || '',
      description: description || '',
      columns: columns
        .filter((c) => !c.collapseFn)
        .map((column) => {
          const paletteParams = {
            ...column.palette?.params,
            // rewrite colors and stops as two distinct arguments
            colors: (column.palette?.params?.stops || []).map(({ color }) => color),
            stops:
              column.palette?.params?.name === 'custom'
                ? (column.palette?.params?.stops || []).map(({ stop }) => stop)
                : [],
            reverse: false, // managed at UI level
          };
          const sortingHint = datasource!.getOperationForColumnId(column.columnId)!.sortingHint;

          const hasNoSummaryRow = column.summaryRow == null || column.summaryRow === 'none';

          const canColor =
            datasource!.getOperationForColumnId(column.columnId)?.dataType === 'number';

          const datatableColumnFn = buildExpressionFunction<DatatableColumnFunction>(
            'lens_datatable_column',
            {
              columnId: column.columnId,
              hidden: column.hidden,
              oneClickFilter: column.oneClickFilter,
              width: column.width,
              isTransposed: column.isTransposed,
              transposable: !datasource!.getOperationForColumnId(column.columnId)?.isBucketed,
              alignment: column.alignment,
              colorMode: canColor && column.colorMode ? column.colorMode : 'none',
              palette: paletteService.get(CUSTOM_PALETTE).toExpression(paletteParams),
              summaryRow: hasNoSummaryRow ? undefined : column.summaryRow!,
              summaryLabel: hasNoSummaryRow
                ? undefined
                : column.summaryLabel ?? getDefaultSummaryLabel(column.summaryRow!),
              sortingHint,
            }
          );
          return buildExpression([datatableColumnFn]).toAst();
        }),
      sortingColumnId: state.sorting?.columnId || '',
      sortingDirection: state.sorting?.direction || 'none',
      fitRowToContent: state.rowHeight === 'auto',
      headerRowHeight: state.headerRowHeight ?? 'single',
      rowHeightLines:
        !state.rowHeight || state.rowHeight === 'single' ? 1 : state.rowHeightLines ?? 2,
      headerRowHeightLines:
        !state.headerRowHeight || state.headerRowHeight === 'single'
          ? 1
          : state.headerRowHeightLines ?? 2,
      pageSize: state.paging?.enabled ? state.paging.size : undefined,
    }).toAst();

    return {
      type: 'expression',
      chain: [...(datasourceExpression?.chain ?? []), ...lensCollapseFnAsts, datatableFnAst],
    };
  },

  getRenderEventCounters(state) {
    const events = {
      color_by_value: false,
      summary_row: false,
    };

    state.columns.forEach((column) => {
      if (column.summaryRow && column.summaryRow !== 'none') {
        events.summary_row = true;
      }
      if (column.colorMode && column.colorMode !== 'none') {
        events.color_by_value = true;
      }
    });

    return Object.entries(events).reduce<string[]>((acc, [key, isActive]) => {
      if (isActive) {
        acc.push(`dimension_${key}`);
      }
      return acc;
    }, []);
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <DataTableToolbar {...props} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  onEditAction(state, event) {
    switch (event.data.action) {
      case 'sort':
        return {
          ...state,
          sorting: {
            columnId: event.data.columnId,
            direction: event.data.direction,
          },
        };
      case 'toggle':
        const toggleColumnId = event.data.columnId;
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === toggleColumnId) {
              return {
                ...column,
                hidden: !column.hidden,
              };
            } else {
              return column;
            }
          }),
        };
      case 'resize':
        const targetWidth = event.data.width;
        const resizeColumnId = event.data.columnId;
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === resizeColumnId) {
              return {
                ...column,
                width: targetWidth,
              };
            } else {
              return column;
            }
          }),
        };
      case 'pagesize':
        return {
          ...state,
          paging: {
            enabled: state.paging?.enabled || false,
            size: event.data.size,
          },
        };
      default:
        return state;
    }
  },
  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<DatatableVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<DatatableVisualizationState, FormBasedPersistedState> = {
      ...allSuggestions[0],
      datasourceState: {
        ...allSuggestions[0].datasourceState,
        layers: allSuggestions.reduce(
          (acc, s) => ({
            ...acc,
            ...s.datasourceState?.layers,
          }),
          {}
        ),
      },
      visualizationState: {
        ...allSuggestions[0].visualizationState,
        ...context.configuration,
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state) {
    const visibleMetricColumns = state.columns.filter(
      (c) => !c.hidden && c.colorMode && c.colorMode !== 'none'
    );

    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: 'table',
          ...this.getDescription(state),
          palette:
            // if multiple columns have color by value, do not show the palette for now: see #154349
            visibleMetricColumns.length > 1
              ? undefined
              : visibleMetricColumns[0]?.palette?.params?.stops?.map(({ color }) => color),
          dimensions: state.columns.map((column) => {
            let name = i18n.translate('xpack.lens.datatable.metric', {
              defaultMessage: 'Metric',
            });
            let dimensionType = 'Metric';
            if (!column.transposable) {
              if (column.isTransposed) {
                name = i18n.translate('xpack.lens.datatable.breakdownColumns', {
                  defaultMessage: 'Split metrics by',
                });
                dimensionType = 'split_metrics';
              } else {
                name = i18n.translate('xpack.lens.datatable.breakdownRow', {
                  defaultMessage: 'Row',
                });
                dimensionType = 'split_rows';
              }
            }
            return {
              dimensionType,
              id: column.columnId,
              name,
            };
          }),
        },
      ],
    };
  },
});

function getDataSourceAndSortedColumns(
  state: DatatableVisualizationState,
  datasourceLayers: DatasourceLayers,
  layerId: string
) {
  const datasource = datasourceLayers[state.layerId];
  const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(
    new Set(originalOrder?.concat(state.columns.map(({ columnId }) => columnId)))
  );
  return { datasource, sortedColumns };
}
