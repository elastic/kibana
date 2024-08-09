/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import d3 from 'd3';
import type { PartialTheme } from '@elastic/charts';
import type { PointerEvent } from '@elastic/charts';
import { CHART_HEIGHT } from '../constants';
interface ChartScales {
  lineChartXScale: (value: number | null | string) => number;
  margin: { left: number; right: number; top: number; bottom: number };
}
export function drawCursor(
  cursor: Required<PointerEvent>,
  rootNode: HTMLDivElement,
  chartId: string,
  config: { plotEarliest: number; plotLatest: number },
  chartScales: ChartScales,
  chartTheme: PartialTheme
) {
  if (!chartScales) return;
  const { lineChartXScale, margin: updatedMargin } = chartScales;

  const element = rootNode;
  const chartElement = d3.select(element).select('#ml-explorer-chart-svg' + chartId);
  if (!chartElement || !lineChartXScale) return;
  chartElement.select('.ml-anomaly-chart-cursor-line').remove();

  const crosshairLine = chartTheme?.crosshair?.line ?? {
    visible: true,
    stroke: '#69707D',
    strokeWidth: 1,
    dash: [4, 4],
  };
  const cursorData =
    cursor &&
    cursor.type === 'Over' &&
    cursor.x !== null &&
    Number(cursor.x) >= config.plotEarliest &&
    Number(cursor.x) <= config.plotLatest
      ? [cursor.x]
      : [];

  const cursorMouseLine = chartElement
    .append('g')
    .attr('class', 'ml-anomaly-chart-cursor')
    .selectAll('.ml-anomaly-chart-cursor-line')
    .data(cursorData);

  // @ts-expect-error d3 types are not up to date
  cursorMouseLine
    .enter()
    .append('path')
    .attr('class', 'ml-anomaly-chart-cursor-line')
    .attr('d', (ts) => {
      const xPosition = lineChartXScale(ts);
      return `M${xPosition},${CHART_HEIGHT} ${xPosition},0`;
    })
    // Use elastic chart's cursor line style if possible
    .style('stroke', crosshairLine.stroke)
    .style('stroke-width', `${crosshairLine.strokeWidth}px`)
    .style('stroke-dasharray', crosshairLine.dash?.join(',') ?? '4,4')
    .attr('transform', 'translate(' + updatedMargin.left + ',' + updatedMargin.top + ')');
  cursorMouseLine.exit().remove();
}
