/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapEmbeddableInput } from '../../../../../../plugins/maps/public/embeddable';

export function toExpression(input: MapEmbeddableInput): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedMap');
  expressionParts.push(`id="${input.id}"`);

  if (input.title) {
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
