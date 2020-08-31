/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../../graphql/types';
import { RowRenderer } from './row_renderer';

const unhandledRowRenderer = (): never => {
  throw new Error('Unhandled Row Renderer');
};

export const getRowRenderer = (ecs: Ecs, rowRenderers: RowRenderer[]): RowRenderer => {
  const renderer = rowRenderers.find((rowRenderer) => rowRenderer.isInstance(ecs));
  if (renderer == null) {
    return unhandledRowRenderer();
  } else {
    return renderer;
  }
};
