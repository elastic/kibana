/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression_reference_lines.scss';
import React from 'react';
import { groupBy } from 'lodash';
import { RectAnnotation, AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { FieldFormat } from 'src/plugins/field_formats/common';
import type { ReferenceLineLayerArgs } from '../../common/expressions';
import type { LensMultiTable } from '../../common/types';
import { defaultReferenceLineColor } from './color_assignment';
import {
  MarkerBody,
  Marker,
  LINES_MARKER_SIZE,
  mapVerticalToHorizontalPlacement,
  getBaseIconPlacement,
} from './annotations_helpers';

export interface ReferenceLineAnnotationsProps {
  layers: ReferenceLineLayerArgs[];
  data: LensMultiTable;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  paletteService: PaletteRegistry;
  syncColors: boolean;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
}

export const ReferenceLineAnnotations = ({
  layers,
  data,
  formatters,
  paletteService,
  syncColors,
  axesMap,
  isHorizontal,
  paddingMap,
}: ReferenceLineAnnotationsProps) => {
  return (
    <>
      {layers.flatMap((layer) => {
        if (!layer.yConfig) {
          return [];
        }
        const { columnToLabel, yConfig: yConfigs, layerId } = layer;
        const columnToLabelMap: Record<string, string> = columnToLabel
          ? JSON.parse(columnToLabel)
          : {};
        const table = data.tables[layerId];

        const row = table.rows[0];

        const yConfigByValue = yConfigs.sort(
          ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
        );

        const groupedByDirection = groupBy(yConfigByValue, 'fill');
        if (groupedByDirection.below) {
          groupedByDirection.below.reverse();
        }

        return yConfigByValue.flatMap((yConfig, i) => {
          // Find the formatter for the given axis
          const groupId =
            yConfig.axisMode === 'bottom'
              ? undefined
              : yConfig.axisMode === 'right'
              ? 'right'
              : 'left';

          const formatter = formatters[groupId || 'bottom'];

          // get the position for vertical chart
          const markerPositionVertical = getBaseIconPlacement(
            yConfig.iconPosition,
            axesMap,
            yConfig.axisMode
          );
          // the padding map is built for vertical chart
          const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;

          const props = {
            groupId,
            marker: (
              <Marker
                config={yConfig}
                label={columnToLabelMap[yConfig.forAccessor]}
                isHorizontal={
                  (!isHorizontal && yConfig.axisMode === 'bottom') ||
                  (isHorizontal && yConfig.axisMode !== 'bottom')
                }
                hasReducedPadding={hasReducedPadding}
              />
            ),
            markerBody: (
              <MarkerBody
                label={
                  yConfig.textVisibility && !hasReducedPadding
                    ? columnToLabelMap[yConfig.forAccessor]
                    : undefined
                }
                isHorizontal={
                  (!isHorizontal && yConfig.axisMode === 'bottom') ||
                  (isHorizontal && yConfig.axisMode !== 'bottom')
                }
              />
            ),
            // rotate the position if required
            markerPosition: isHorizontal
              ? mapVerticalToHorizontalPlacement(markerPositionVertical)
              : markerPositionVertical,
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
            stroke: yConfig.color || defaultReferenceLineColor,
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
            const shouldCheckNextReferenceLine =
              indexFromSameType < groupedByDirection[yConfig.fill].length - 1;
            annotations.push(
              <RectAnnotation
                {...props}
                id={`${layerId}-${yConfig.forAccessor}-rect`}
                key={`${layerId}-${yConfig.forAccessor}-rect`}
                dataValues={table.rows.map(() => {
                  const nextValue = shouldCheckNextReferenceLine
                    ? row[groupedByDirection[yConfig.fill!][indexFromSameType + 1].forAccessor]
                    : undefined;
                  if (yConfig.axisMode === 'bottom') {
                    return {
                      coordinates: {
                        x0: isFillAbove ? row[yConfig.forAccessor] : nextValue,
                        y0: undefined,
                        x1: isFillAbove ? nextValue : row[yConfig.forAccessor],
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
                      y0: isFillAbove ? row[yConfig.forAccessor] : nextValue,
                      x1: undefined,
                      y1: isFillAbove ? nextValue : row[yConfig.forAccessor],
                    },
                    header: columnToLabelMap[yConfig.forAccessor],
                    details:
                      formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
                  };
                })}
                style={{
                  ...sharedStyle,
                  fill: yConfig.color || defaultReferenceLineColor,
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
