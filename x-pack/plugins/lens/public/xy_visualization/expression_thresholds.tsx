/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy } from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { FieldFormat } from 'src/plugins/field_formats/common';
import { euiLightVars } from '@kbn/ui-shared-deps-src/theme';
import type { LayerArgs, YConfig } from '../../common/expressions';
import type { LensMultiTable } from '../../common/types';

const THRESHOLD_ICON_SIZE = 20;

export const computeChartMargins = (
  thresholdPaddings: Partial<Record<Position, number>>,
  labelVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  titleVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  axesMap: Record<'left' | 'right', unknown>,
  isHorizontal: boolean
) => {
  const result: Partial<Record<Position, number>> = {};
  if (!labelVisibility?.x && !titleVisibility?.x && thresholdPaddings.bottom) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('bottom') : 'bottom';
    result[placement] = thresholdPaddings.bottom;
  }
  if (
    thresholdPaddings.left &&
    (isHorizontal || (!labelVisibility?.yLeft && !titleVisibility?.yLeft))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('left') : 'left';
    result[placement] = thresholdPaddings.left;
  }
  if (
    thresholdPaddings.right &&
    (isHorizontal || !axesMap.right || (!labelVisibility?.yRight && !titleVisibility?.yRight))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('right') : 'right';
    result[placement] = thresholdPaddings.right;
  }
  // there's no top axis, so just check if a margin has been computed
  if (thresholdPaddings.top) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('top') : 'top';
    result[placement] = thresholdPaddings.top;
  }
  return result;
};

function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'none';
}

// Note: it does not take into consideration whether the threshold is in view or not
export const getThresholdRequiredPaddings = (
  thresholdLayers: LayerArgs[],
  axesMap: Record<'left' | 'right', unknown>
) => {
  const positions = Object.keys(Position);
  return thresholdLayers.reduce((memo, layer) => {
    if (positions.some((pos) => !(pos in memo))) {
      layer.yConfig?.forEach(({ axisMode, icon, iconPosition }) => {
        if (axisMode && hasIcon(icon)) {
          const placement = getBaseIconPlacement(iconPosition, axisMode, axesMap);
          memo[placement] = THRESHOLD_ICON_SIZE;
        }
      });
    }
    return memo;
  }, {} as Partial<Record<Position, number>>);
};

function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
function getBaseIconPlacement(
  iconPosition: YConfig['iconPosition'],
  axisMode: YConfig['axisMode'],
  axesMap: Record<string, unknown>
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axisMode === 'left') {
      return axesMap.right ? Position.Left : Position.Right;
    }
    return axesMap.left ? Position.Right : Position.Left;
  }

  if (iconPosition === 'left') {
    return Position.Left;
  }
  if (iconPosition === 'right') {
    return Position.Right;
  }
  if (iconPosition === 'below') {
    return Position.Bottom;
  }
  return Position.Top;
}

function getIconPlacement(
  iconPosition: YConfig['iconPosition'],
  axisMode: YConfig['axisMode'],
  axesMap: Record<string, unknown>,
  isHorizontal: boolean
) {
  const vPosition = getBaseIconPlacement(iconPosition, axisMode, axesMap);
  if (isHorizontal) {
    return mapVerticalToHorizontalPlacement(vPosition);
  }
  return vPosition;
}

export const ThresholdAnnotations = ({
  thresholdLayers,
  data,
  formatters,
  paletteService,
  syncColors,
  axesMap,
  isHorizontal,
}: {
  thresholdLayers: LayerArgs[];
  data: LensMultiTable;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  paletteService: PaletteRegistry;
  syncColors: boolean;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
}) => {
  return (
    <>
      {thresholdLayers.flatMap((thresholdLayer) => {
        if (!thresholdLayer.yConfig) {
          return [];
        }
        const { columnToLabel, yConfig: yConfigs, layerId } = thresholdLayer;
        const columnToLabelMap: Record<string, string> = columnToLabel
          ? JSON.parse(columnToLabel)
          : {};
        const table = data.tables[layerId];

        const row = table.rows[0];

        const yConfigByValue = yConfigs.sort(
          ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
        );

        const groupedByDirection = groupBy(yConfigByValue, 'fill');

        return yConfigByValue.flatMap((yConfig, i) => {
          // Find the formatter for the given axis
          const groupId =
            yConfig.axisMode === 'bottom'
              ? undefined
              : yConfig.axisMode === 'right'
              ? 'right'
              : 'left';

          const formatter = formatters[groupId || 'bottom'];

          const defaultColor = euiLightVars.euiColorDarkShade;

          const props = {
            groupId,
            marker: hasIcon(yConfig.icon) ? <EuiIcon type={yConfig.icon} /> : undefined,
            markerPosition: getIconPlacement(
              yConfig.iconPosition,
              yConfig.axisMode,
              axesMap,
              isHorizontal
            ),
          };
          const annotations = [];

          const dashStyle =
            yConfig.lineStyle === 'dashed'
              ? [(yConfig.lineWidth || 1) * 3, yConfig.lineWidth || 1]
              : yConfig.lineStyle === 'dotted'
              ? [yConfig.lineWidth || 1, yConfig.lineWidth || 1]
              : undefined;

          const sharedStyle = {
            strokeWidth: yConfig.lineWidth || 1,
            stroke: yConfig.color || defaultColor,
            dash: dashStyle,
          };

          annotations.push(
            <LineAnnotation
              {...props}
              id={`${layerId}-${yConfig.forAccessor}-line`}
              key={`${layerId}-${yConfig.forAccessor}-line`}
              dataValues={table.rows.map(() => ({
                dataValue: row[yConfig.forAccessor],
                header: columnToLabelMap[yConfig.forAccessor],
                details: formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
              }))}
              domainType={
                yConfig.axisMode === 'bottom'
                  ? AnnotationDomainType.XDomain
                  : AnnotationDomainType.YDomain
              }
              style={{
                line: {
                  ...sharedStyle,
                  opacity: 1,
                },
              }}
            />
          );

          if (yConfig.fill && yConfig.fill !== 'none') {
            const isFillAbove = yConfig.fill === 'above';
            const indexFromSameType = groupedByDirection[yConfig.fill].findIndex(
              ({ forAccessor }) => forAccessor === yConfig.forAccessor
            );
            const shouldCheckNextThreshold =
              indexFromSameType < groupedByDirection[yConfig.fill].length - 1;
            annotations.push(
              <RectAnnotation
                {...props}
                id={`${layerId}-${yConfig.forAccessor}-rect`}
                key={`${layerId}-${yConfig.forAccessor}-rect`}
                dataValues={table.rows.map(() => {
                  if (yConfig.axisMode === 'bottom') {
                    return {
                      coordinates: {
                        x0: isFillAbove ? row[yConfig.forAccessor] : undefined,
                        y0: undefined,
                        x1: isFillAbove
                          ? shouldCheckNextThreshold
                            ? row[
                                groupedByDirection[yConfig.fill!][indexFromSameType + 1].forAccessor
                              ]
                            : undefined
                          : row[yConfig.forAccessor],
                        y1: undefined,
                      },
                      header: columnToLabelMap[yConfig.forAccessor],
                      details:
                        formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
                    };
                  }
                  return {
                    coordinates: {
                      x0: undefined,
                      y0: isFillAbove ? row[yConfig.forAccessor] : undefined,
                      x1: undefined,
                      y1: isFillAbove
                        ? shouldCheckNextThreshold
                          ? row[
                              groupedByDirection[yConfig.fill!][indexFromSameType + 1].forAccessor
                            ]
                          : undefined
                        : row[yConfig.forAccessor],
                    },
                    header: columnToLabelMap[yConfig.forAccessor],
                    details:
                      formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
                  };
                })}
                style={{
                  ...sharedStyle,
                  fill: yConfig.color || defaultColor,
                  opacity: 0.1,
                }}
              />
            );
          }
          return annotations;
        });
      })}
    </>
  );
};
