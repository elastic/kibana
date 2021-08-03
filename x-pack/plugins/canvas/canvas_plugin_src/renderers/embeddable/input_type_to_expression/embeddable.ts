/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression as toExpressionString } from '@kbn/interpreter/common';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { EmbeddableInput } from '../../../functions/external/embeddable';

export function toExpression(
  input: EmbeddableInput,
  embeddableType: string,
  palettes: PaletteRegistry
): string {
  const expressionParts = [] as string[];

  expressionParts.push('embeddable');

  expressionParts.push(`id="${input.id}"`);

  expressionParts.push(`type="${embeddableType}"`);

  if (input.title !== undefined) {
    expressionParts.push(`title="${input.title}"`);
  }

  if (input.timeRange) {
    expressionParts.push(
      `timerange={timerange from="${input.timeRange.from}" to="${input.timeRange.to}"}`
    );
  }

  if (input.palette) {
    expressionParts.push(
      `palette={${toExpressionString(
        palettes.get(input.palette.name).toExpression(input.palette.params)
      )}}`
    );
  }

  if (input.hidePanelTitles !== undefined) {
    expressionParts.push(`hideTitle=${input.hidePanelTitles}`);
  }

  return expressionParts.join(' ');
}
