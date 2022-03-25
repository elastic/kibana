/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression as toExpressionString } from '@kbn/interpreter';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { SavedLensInput } from '../../../functions/external/saved_lens';

export function toExpression(input: SavedLensInput, palettes: PaletteRegistry): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedLens');

  expressionParts.push(`id="${input.savedObjectId}"`);

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

  return expressionParts.join(' ');
}
