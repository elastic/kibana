/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VisualizeInput } from 'src/plugins/visualizations/public';

export function toExpression(input: VisualizeInput): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedVisualization');
  expressionParts.push(`id="${input.id}"`);

  if (input.timeRange) {
    expressionParts.push(
      `timerange={timerange from="${input.timeRange.from}" to="${input.timeRange.to}"}`
    );
  }

  if (input.vis?.colors) {
    Object.entries(input.vis.colors)
      .map(([label, color]) => {
        return `colors={seriesStyle label="${label}" color="${color}"}`;
      })
      .reduce((_, part) => expressionParts.push(part), 0);
  }

  // @ts-expect-error LegendOpen missing on VisualizeInput type
  if (input.vis?.legendOpen !== undefined && input.vis.legendOpen === false) {
    expressionParts.push(`hideLegend=true`);
  }

  return expressionParts.join(' ');
}
