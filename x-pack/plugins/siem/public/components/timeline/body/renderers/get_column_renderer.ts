/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineNonEcsData } from '../../../../graphql/types';
import { ColumnRenderer } from './column_renderer';

const unhandledColumnRenderer = (): never => {
  throw new Error('Unhandled Column Renderer');
};

export const getColumnRenderer = (
  columnName: string,
  columnRenderers: ColumnRenderer[],
  data: TimelineNonEcsData[]
): ColumnRenderer => {
  const renderer = columnRenderers.find(columnRenderer =>
    columnRenderer.isInstance(columnName, data)
  );
  return renderer != null ? renderer : unhandledColumnRenderer();
};
