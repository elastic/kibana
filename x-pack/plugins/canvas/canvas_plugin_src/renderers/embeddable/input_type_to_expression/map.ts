/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapEmbeddableInput } from '../../../../../../plugins/maps/public';

export function toExpression(input: MapEmbeddableInput & { savedObjectId: string }): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedMap');

  expressionParts.push(`id="${input.savedObjectId}"`);

  if (input.title !== undefined) {
    expressionParts.push(`title="${input.title}"`);
  }

  if (input.mapCenter) {
    expressionParts.push(
      `center={mapCenter lat=${input.mapCenter.lat} lon=${input.mapCenter.lon} zoom=${input.mapCenter.zoom}}`
    );
  }

  if (input.timeRange) {
    expressionParts.push(
      `timerange={timerange from="${input.timeRange.from}" to="${input.timeRange.to}"}`
    );
  }

  if (input.hiddenLayers && input.hiddenLayers.length) {
    for (const layerId of input.hiddenLayers) {
      expressionParts.push(`hideLayer="${layerId}"`);
    }
  }

  return expressionParts.join(' ');
}
