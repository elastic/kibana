/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RowRenderer, RowRendererId } from '@kbn/row-renderers';
import type { Ecs } from '../../../../../../../common/ecs';

export const combineRenderers = ({
  a,
  b,
  id,
}: {
  a: RowRenderer;
  b: RowRenderer;
  id: RowRendererId;
}): RowRenderer => ({
  id,
  isInstance: (data: Ecs) => a.isInstance(data) || b.isInstance(data),
  renderRow: ({
    contextId,
    data,
    isDraggable,
    scopeId,
  }: {
    contextId?: string;
    data: Ecs;
    isDraggable: boolean;
    scopeId: string;
  }) => (
    <>
      {a.isInstance(data) && a.renderRow({ contextId, data, isDraggable, scopeId })}
      {b.isInstance(data) && b.renderRow({ contextId, data, isDraggable, scopeId })}
    </>
  ),
});
