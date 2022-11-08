/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import { Position, ScaleType } from '@elastic/charts';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionFunctionTheme,
} from '@kbn/expressions-plugin/common';
import {
  EventAnnotationServiceType,
  isManualPointAnnotationConfig,
  isRangeAnnotationConfig,
} from '@kbn/event-annotation-plugin/public';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import {
  AvailableReferenceLineIcon,
  DataDecorationConfigFn,
  EventAnnotationResultFn,
  ExtendedAnnotationLayerFn,
  ExtendedDataLayerFn,
  LayeredXyVisFn,
  LegendConfigFn,
  ReferenceLineDecorationConfigFn,
  ReferenceLineLayerFn,
  SeriesType,
  XAxisConfigFn,
  XScaleType,
  XYCurveType,
  YAxisConfigFn,
} from '@kbn/expression-xy-plugin/common';
import { EventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { SystemPaletteExpressionFunctionDefinition } from '@kbn/charts-plugin/common';
import type {
  State,
  YConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYAnnotationLayerConfig,
  AxisConfig,
  ValidXYDataLayerConfig,
} from './types';
import type { OperationMetadata, DatasourcePublicAPI, DatasourceLayers } from '../../types';
import { getColumnToLabelMap } from './state_helpers';
import { hasIcon } from './xy_config_panel/shared/icon_select';
import { defaultReferenceLineColor } from './color_assignment';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import {
  getLayerTypeOptions,
  getDataLayers,
  getReferenceLayers,
  getAnnotationsLayers,
} from './visualization_helpers';
import { getUniqueLabels } from './annotations/helpers';
import { axisExtentConfigToExpression } from '../../shared_components';
import type { CollapseExpressionFunction } from '../../../common/expressions';

export const getSortedAccessors = (
  datasource: DatasourcePublicAPI | undefined,
  layer: XYDataLayerConfig | XYReferenceLineLayerConfig
) => {
  const originalOrder = datasource
    ? datasource
        .getTableSpec()
        .map(({ columnId }: { columnId: string }) => columnId)
        .filter((columnId: string) => layer.accessors.includes(columnId))
    : layer.accessors;
  // When we add a column it could be empty, and therefore have no order
  return Array.from(new Set(originalOrder.concat(layer.accessors)));
};

export const toExpression = (
  state: State,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  attributes: Partial<{ title: string; description: string }> = {},
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
): Ast | null => {
  if (!state || !state.layers.length) {
    return null;
  }

  const metadata: Record<string, Record<string, OperationMetadata | null>> = {};
  state.layers.forEach((layer) => {
    metadata[layer.layerId] = {};
    const datasource = datasourceLayers[layer.layerId];
    if (datasource) {
      datasource.getTableSpec().forEach((column) => {
        const operation =
          datasourceLayers[layer.layerId]?.getOperationForColumnId(column.columnId) ?? null;
        metadata[layer.layerId][column.columnId] = operation;
      });
    }
  });

  return buildXYExpression(
    state,
    metadata,
    datasourceLayers,
    paletteService,
    datasourceExpressionsByLayers,
    eventAnnotationService
  );
};

const simplifiedLayerExpression = {
  [LayerTypes.DATA]: (layer: XYDataLayerConfig) => ({ ...layer, simpleView: true }),
  [LayerTypes.REFERENCELINE]: (layer: XYReferenceLineLayerConfig) => ({
    ...layer,
    simpleView: true,
    yConfig: layer.yConfig?.map(({ ...rest }) => ({
      ...rest,
      lineWidth: 1,
      icon: undefined,
      textVisibility: false,
    })),
  }),
  [LayerTypes.ANNOTATIONS]: (layer: XYAnnotationLayerConfig) => ({
    ...layer,
    simpleView: true,
  }),
};

export function toPreviewExpression(
  state: State,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map((layer) => getLayerTypeOptions(layer, simplifiedLayerExpression)),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
      valueLabels: 'hide',
    },
    datasourceLayers,
    paletteService,
    {},
    datasourceExpressionsByLayers,
    eventAnnotationService
  );
}

export function getScaleType(metadata: OperationMetadata | null, defaultScale: ScaleType) {
  if (!metadata) {
    return defaultScale;
  }

  // use scale information if available
  if (metadata.scale === 'ordinal') {
    return ScaleType.Ordinal;
  }
  if (metadata.scale === 'interval' || metadata.scale === 'ratio') {
    return metadata.dataType === 'date' ? ScaleType.Time : ScaleType.Linear;
  }

  // fall back to data type if necessary
  switch (metadata.dataType) {
    case 'boolean':
    case 'string':
    case 'ip':
      return ScaleType.Ordinal;
    case 'date':
      return ScaleType.Time;
    default:
      return ScaleType.Linear;
  }
}

export const buildXYExpression = (
  state: State,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  datasourceLayers: DatasourceLayers,
  paletteService: PaletteRegistry,
  datasourceExpressionsByLayers: Record<string, Ast>,
  eventAnnotationService: EventAnnotationServiceType
): Ast | null => {
  const validDataLayers: ValidXYDataLayerConfig[] = getDataLayers(state.layers)
    .filter<ValidXYDataLayerConfig>((layer): layer is ValidXYDataLayerConfig =>
      Boolean(layer.accessors.length)
    )
    .map((layer) => ({
      ...layer,
      accessors: getSortedAccessors(datasourceLayers[layer.layerId], layer),
    }));

  // sorting doesn't change anything so we don't sort reference layers (TODO: should we make it work?)
  const validReferenceLayers = getReferenceLayers(state.layers).filter((layer) =>
    Boolean(layer.accessors.length)
  );

  const uniqueLabels = getUniqueLabels(state.layers);
  const validAnnotationsLayers = getAnnotationsLayers(state.layers)
    .filter((layer) => Boolean(layer.annotations.length))
    .map((layer) => {
      return {
        ...layer,
        annotations: layer.annotations.map((c) => ({
          ...c,
          label: uniqueLabels[c.id],
          ...(c.type === 'query'
            ? // Move the ignore flag at the event level
              { ignoreGlobalFilters: layer.ignoreGlobalFilters }
            : {}),
        })),
      };
    });

  if (!validDataLayers.length) {
    return null;
  }

  const isLeftAxis = validDataLayers.some(({ yConfig }) =>
    yConfig?.some((config) => config.axisMode === Position.Left)
  );
  const isRightAxis = validDataLayers.some(({ yConfig }) =>
    yConfig?.some((config) => config.axisMode === Position.Right)
  );

  const yAxisConfigs: AxisConfig[] = [
    {
      position: Position.Left,
      extent: state?.yLeftExtent,
      showTitle: state?.axisTitlesVisibilitySettings?.yLeft ?? true,
      title: state.yTitle || '',
      showLabels: state?.tickLabelsVisibilitySettings?.yLeft ?? true,
      showGridLines: state?.gridlinesVisibilitySettings?.yLeft ?? true,
      labelsOrientation: state?.labelsOrientation?.yLeft ?? 0,
      scaleType: state.yLeftScale || 'linear',
    },
    {
      position: Position.Right,
      extent: state?.yRightExtent,
      showTitle: state?.axisTitlesVisibilitySettings?.yRight ?? true,
      title: state.yRightTitle || '',
      showLabels: state?.tickLabelsVisibilitySettings?.yRight ?? true,
      showGridLines: state?.gridlinesVisibilitySettings?.yRight ?? true,
      labelsOrientation: state?.labelsOrientation?.yRight ?? 0,
      scaleType: state.yRightScale || 'linear',
    },
  ];

  if (isLeftAxis) {
    yAxisConfigs.push({
      id: Position.Left,
      position: Position.Left,
      // we need also settings from global config here so that default's doesn't override it
      ...yAxisConfigs[0],
    });
  }

  if (isRightAxis) {
    yAxisConfigs.push({
      id: Position.Right,
      position: Position.Right,
      // we need also settings from global config here so that default's doesn't override it
      ...yAxisConfigs[1],
    });
  }

  const isValidAnnotation = (a: EventAnnotationConfig) =>
    isManualPointAnnotationConfig(a) ||
    isRangeAnnotationConfig(a) ||
    (a.filter && a.filter?.query !== '');

  const legendConfigFn = buildExpressionFunction<LegendConfigFn>('legendConfig', {
    isVisible: state.legend.isVisible,
    showSingleSeries: state.legend.showSingleSeries,
    position: !state.legend.isInside ? state.legend.position : [],
    isInside: state.legend.isInside ? state.legend.isInside : undefined,
    legendSize: state.legend.isInside
      ? undefined
      : state.legend.position === Position.Top || state.legend.position === Position.Bottom
      ? LegendSize.AUTO
      : state.legend.legendSize
      ? state.legend.legendSize
      : undefined,
    horizontalAlignment:
      state.legend.horizontalAlignment && state.legend.isInside
        ? state.legend.horizontalAlignment
        : undefined,
    verticalAlignment:
      state.legend.verticalAlignment && state.legend.isInside
        ? state.legend.verticalAlignment
        : undefined,
    // ensure that even if the user types more than 5 columns
    // we will only show 5
    floatingColumns:
      state.legend.floatingColumns && state.legend.isInside
        ? Math.min(5, state.legend.floatingColumns)
        : [],
    maxLines: state.legend.maxLines,
    shouldTruncate:
      state.legend.shouldTruncate ??
      getDefaultVisualValuesForLayer(state, datasourceLayers).truncateText,
  });

  const xAxisConfigFn = buildExpressionFunction<XAxisConfigFn>('xAxisConfig', {
    id: 'x',
    position: 'bottom',
    title: state.xTitle || '',
    showTitle: state?.axisTitlesVisibilitySettings?.x ?? true,
    showLabels: state?.tickLabelsVisibilitySettings?.x ?? true,
    showGridLines: state?.gridlinesVisibilitySettings?.x ?? true,
    labelsOrientation: state?.labelsOrientation?.x ?? 0,
    extent: state.xExtent ? [axisExtentConfigToExpression(state.xExtent)] : [],
  });

  const layeredXyVisFn = buildExpressionFunction<LayeredXyVisFn>('layeredXyVis', {
    legend: buildExpression([legendConfigFn]).toAst(),
    fittingFunction: state.fittingFunction || 'None',
    endValue: state.endValue || 'None',
    emphasizeFitting: state.emphasizeFitting || false,
    fillOpacity: state.fillOpacity || 0.3,
    valueLabels: state?.valueLabels || 'hide',
    hideEndzones: state?.hideEndzones || false,
    addTimeMarker: state?.showCurrentTimeMarker || false,
    valuesInLegend: state?.valuesInLegend || false,
    yAxisConfigs: [...yAxisConfigsToExpression(yAxisConfigs)],
    xAxisConfig: buildExpression([xAxisConfigFn]).toAst(),
    showTooltip: [],
    layers: [
      ...validDataLayers.map((layer) =>
        dataLayerToExpression(
          layer,
          yAxisConfigs,
          datasourceLayers[layer.layerId],
          metadata,
          paletteService,
          datasourceExpressionsByLayers[layer.layerId],
          state.curveType || 'LINEAR'
        )
      ),
      ...validReferenceLayers.map((layer) =>
        referenceLineLayerToExpression(
          layer,
          datasourceLayers[(layer as XYReferenceLineLayerConfig).layerId],
          datasourceExpressionsByLayers[layer.layerId]
        )
      ),
    ],
    annotations:
      validAnnotationsLayers.length &&
      validAnnotationsLayers.flatMap((l) => l.annotations.filter(isValidAnnotation)).length
        ? [
            buildExpression([
              buildExpressionFunction<EventAnnotationResultFn>('event_annotations_result', {
                layers: validAnnotationsLayers.map((layer) =>
                  annotationLayerToExpression(layer, eventAnnotationService)
                ),
                datatable: eventAnnotationService.toFetchExpression({
                  interval:
                    (validDataLayers[0]?.xAccessor &&
                      metadata[validDataLayers[0]?.layerId]?.[validDataLayers[0]?.xAccessor]
                        ?.interval) ||
                    'auto',
                  groups: validAnnotationsLayers.map((layer) => ({
                    indexPatternId: layer.indexPatternId,
                    annotations: layer.annotations.filter(isValidAnnotation),
                  })),
                }),
              }),
            ]).toAst(),
          ]
        : [],
  });
  return buildExpression([layeredXyVisFn]).toAst();
};

const yAxisConfigsToExpression = (yAxisConfigs: AxisConfig[]): Ast[] => {
  return yAxisConfigs.map((axis) =>
    buildExpression([
      buildExpressionFunction<YAxisConfigFn>('yAxisConfig', {
        id: axis.id,
        position: axis.position,
        extent: axis.extent ? axisExtentConfigToExpression(axis.extent) : undefined,
        showTitle: axis.showTitle ?? true,
        title: axis.title,
        showLabels: axis.showLabels ?? true,
        showGridLines: axis.showGridLines ?? true,
        labelsOrientation: axis.labelsOrientation,
        scaleType: axis.scaleType,
      }),
    ]).toAst()
  );
};

const referenceLineLayerToExpression = (
  layer: XYReferenceLineLayerConfig,
  datasourceLayer: DatasourcePublicAPI | undefined,
  datasourceExpression: Ast
): Ast => {
  const referenceLineLayerFn = buildExpressionFunction<ReferenceLineLayerFn>('referenceLineLayer', {
    layerId: layer.layerId,
    decorations: layer.yConfig
      ? layer.yConfig.map((yConfig) =>
          extendedYConfigToRLDecorationConfigExpression(yConfig, defaultReferenceLineColor)
        )
      : [],
    accessors: layer.accessors,
    columnToLabel: JSON.stringify(getColumnToLabelMap(layer, datasourceLayer)),
    ...(datasourceExpression && datasourceExpression.chain.length
      ? { table: datasourceExpression }
      : {}),
  });

  return buildExpression([referenceLineLayerFn]).toAst();
};

const annotationLayerToExpression = (
  layer: XYAnnotationLayerConfig,
  eventAnnotationService: EventAnnotationServiceType
): Ast => {
  const extendedAnnotationLayerFn = buildExpressionFunction<ExtendedAnnotationLayerFn>(
    'extendedAnnotationLayer',
    {
      simpleView: Boolean(layer.simpleView),
      layerId: layer.layerId,
      annotations: eventAnnotationService.toExpression(layer.annotations || []),
    }
  );
  return buildExpression([extendedAnnotationLayerFn]).toAst();
};

const dataLayerToExpression = (
  layer: ValidXYDataLayerConfig,
  yAxisConfigs: AxisConfig[],
  datasourceLayer: DatasourcePublicAPI | undefined,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  paletteService: PaletteRegistry,
  datasourceExpression: Ast,
  curveType: XYCurveType
): Ast => {
  const columnToLabel = getColumnToLabelMap(layer, datasourceLayer);

  const xAxisOperation = datasourceLayer?.getOperationForColumnId(layer.xAccessor);

  const isHistogramDimension = Boolean(
    xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
  );

  const dataFromType = layer.seriesType.split('_');
  const seriesType = dataFromType[0];
  const isPercentage = dataFromType.includes('percentage');
  const isStacked = dataFromType.includes('stacked');
  const isHorizontal = dataFromType.includes('horizontal');

  const collapseFn = buildExpressionFunction<CollapseExpressionFunction>('lens_collapse', {
    by: layer.xAccessor ? [layer.xAccessor] : [],
    metric: layer.accessors,
    fn: [layer.collapseFn!],
  });

  const extendedDataLayerFn = buildExpressionFunction<ExtendedDataLayerFn>('extendedDataLayer', {
    layerId: layer.layerId,
    simpleView: Boolean(layer.simpleView),
    xAccessor: layer.xAccessor,
    xScaleType: getScaleType(
      metadata[layer.layerId][layer.xAccessor],
      ScaleType.Linear
    ) as XScaleType,
    isHistogram: isHistogramDimension,
    isPercentage,
    isStacked,
    isHorizontal,
    splitAccessors: layer.collapseFn || !layer.splitAccessor ? undefined : [layer.splitAccessor],
    decorations: layer.yConfig
      ? layer.yConfig.map((yConfig) =>
          yConfigToDataDecorationConfigExpression(yConfig, yAxisConfigs)
        )
      : undefined,
    curveType,
    seriesType: seriesType as SeriesType,
    showLines: seriesType === 'line' || seriesType === 'area',
    accessors: layer.accessors,
    columnToLabel: JSON.stringify(columnToLabel),
    palette: buildExpression([
      layer.palette
        ? buildExpressionFunction<ExpressionFunctionTheme>('theme', {
            variable: 'palette',
            default: [paletteService.get(layer.palette.name).toExpression(layer.palette.params)],
          })
        : buildExpressionFunction<SystemPaletteExpressionFunctionDefinition>('system_palette', {
            name: 'default',
          }),
    ]).toAst(),
  });

  return {
    type: 'expression',
    chain: [
      ...(datasourceExpression
        ? [...datasourceExpression.chain, ...(layer.collapseFn ? [collapseFn.toAst()] : [])]
        : []),
      extendedDataLayerFn.toAst(),
    ],
  };
};

const yConfigToDataDecorationConfigExpression = (
  yConfig: YConfig,
  yAxisConfigs: AxisConfig[],
  defaultColor?: string
): Ast => {
  const axisId = yAxisConfigs.find((axis) => axis.id && axis.position === yConfig.axisMode)?.id;
  const dataDecorationConfigFn = buildExpressionFunction<DataDecorationConfigFn>(
    'dataDecorationConfig',
    {
      axisId,
      forAccessor: yConfig.forAccessor,
      color: yConfig.color ?? defaultColor,
    }
  );
  return buildExpression([dataDecorationConfigFn]).toAst();
};

const extendedYConfigToRLDecorationConfigExpression = (
  yConfig: YConfig,
  defaultColor?: string
): Ast => {
  const referenceLineDecorationConfigFn = buildExpressionFunction<ReferenceLineDecorationConfigFn>(
    'referenceLineDecorationConfig',
    {
      forAccessor: yConfig.forAccessor,
      position: yConfig.axisMode as Position,
      color: yConfig.color ?? defaultColor,
      lineStyle: yConfig.lineStyle || 'solid',
      lineWidth: yConfig.lineWidth || 1,
      fill: yConfig.fill || 'none',
      icon: hasIcon(yConfig.icon) ? (yConfig.icon as AvailableReferenceLineIcon) : undefined,
      iconPosition:
        hasIcon(yConfig.icon) || yConfig.textVisibility ? yConfig.iconPosition || 'auto' : 'auto',
      textVisibility: yConfig.textVisibility || false,
    }
  );
  return buildExpression([referenceLineDecorationConfigFn]).toAst();
};
