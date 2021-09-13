/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy } from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import type { PaletteRegistry, SeriesLayer } from 'src/plugins/charts/public';
import type { LayerArgs } from '../../common/expressions';
import type { FormatFactory, LensMultiTable } from '../../common/types';
import type { ColorAssignments } from './color_assignment';

export const ThresholdAnnotations = ({
  thresholdLayers,
  data,
  colorAssignments,
  formatFactory,
  paletteService,
  syncColors,
}: {
  thresholdLayers: LayerArgs[];
  data: LensMultiTable;
  colorAssignments: ColorAssignments;
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
  syncColors: boolean;
}) => {
  return (
    <>
      {thresholdLayers.flatMap((thresholdLayer) => {
        if (!thresholdLayer.yConfig) {
          return [];
        }
        const { columnToLabel, palette, yConfig: yConfigs, layerId } = thresholdLayer;
        const columnToLabelMap: Record<string, string> = columnToLabel
          ? JSON.parse(columnToLabel)
          : {};
        const table = data.tables[layerId];
        const colorAssignment = colorAssignments[palette.name];

        const row = table.rows[0];

        const yConfigByValue = yConfigs.sort(
          ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
        );

        const groupedByDirection = groupBy(yConfigByValue, 'fill');

        return yConfigByValue.flatMap((yConfig, i) => {
          const formatter = formatFactory(
            table?.columns.find((column) => column.id === yConfig.forAccessor)?.meta?.params || {
              id: 'number',
            }
          );

          const seriesLayers: SeriesLayer[] = [
            {
              name: columnToLabelMap[yConfig.forAccessor],
              totalSeriesAtDepth: colorAssignment.totalSeriesCount,
              rankAtDepth: colorAssignment.getRank(
                thresholdLayer,
                String(yConfig.forAccessor),
                String(yConfig.forAccessor)
              ),
            },
          ];
          const defaultColor = paletteService.get(palette.name).getCategoricalColor(
            seriesLayers,
            {
              maxDepth: 1,
              behindText: false,
              totalSeries: colorAssignment.totalSeriesCount,
              syncColors,
            },
            palette.params
          );

          const props = {
            groupId:
              yConfig.axisMode === 'bottom'
                ? undefined
                : yConfig.axisMode === 'right'
                ? 'right'
                : 'left',
            marker: yConfig.icon ? <EuiIcon type={yConfig.icon} /> : undefined,
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
            stroke: (yConfig.color || defaultColor) ?? '#f00',
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
                details: formatter.convert(row[yConfig.forAccessor]),
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
                      details: formatter.convert(row[yConfig.forAccessor]),
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
                    details: formatter.convert(row[yConfig.forAccessor]),
                  };
                })}
                style={{
                  ...sharedStyle,
                  fill: (yConfig.color || defaultColor) ?? '#f00',
                  opacity: 0.3,
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
