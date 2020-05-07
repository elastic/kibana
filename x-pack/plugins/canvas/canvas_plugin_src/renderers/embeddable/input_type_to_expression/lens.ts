/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedLensInput } from '../../../functions/common/saved_lens';

export function toExpression(input: SavedLensInput): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedLens');

  expressionParts.push(`id="${input.id}"`);

  if (input.title) {
    expressionParts.push(`title="${input.title}"`);
  }

  if (input.timeRange) {
    expressionParts.push(
      `timerange={timerange from="${input.timeRange.from}" to="${input.timeRange.to}"}`
    );
  }

  return expressionParts.join(' ');
}
