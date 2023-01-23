/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { alertRenderer } from './alert_renderer';
import { combineRenderers } from './combine_renderers';
import type { RowRenderer } from '../../../../../../common/types';

/**
 * This function may be used by both Timeline and the `Event Rendered view` in
 * the Alerts table to return the first instance of a `RowRenderer` that
 * matches the data
 */
export const getRowRenderer = ({
  data,
  rowRenderers,
}: {
  data: Ecs;
  rowRenderers: RowRenderer[];
}): RowRenderer | null => {
  const renderer = rowRenderers.find((rowRenderer) => rowRenderer.isInstance(data)) ?? null;

  if (alertRenderer.isInstance(data)) {
    if (renderer != null) {
      // The combined renderer will display details about the alert, combined
      // with the content from the event renderer that was found:
      return combineRenderers({ a: alertRenderer, b: renderer, id: renderer.id });
    } else {
      return alertRenderer;
    }
  }

  return renderer;
};
