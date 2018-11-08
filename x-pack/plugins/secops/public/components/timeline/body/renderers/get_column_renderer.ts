/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnRenderer } from '.';
import { ECS } from '../../ecs';

const unhandledColumnRenderer = (): never => {
  throw new Error('Unhandled Column Renderer');
};

export const getColumnRenderer = (
  columnName: string,
  columnRenderers: ColumnRenderer[],
  ecs: ECS
): ColumnRenderer => {
  const renderer = columnRenderers.find(columnRenderer =>
    columnRenderer.isInstance(columnName, ecs)
  );
  if (renderer == null) {
    return unhandledColumnRenderer();
  } else {
    return renderer;
  }
};
