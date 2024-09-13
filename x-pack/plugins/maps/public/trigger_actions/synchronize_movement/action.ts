/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type EmbeddableApiContext, apiHasType } from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { SynchronizeMovementActionApi } from './types';

export const SYNCHRONIZE_MOVEMENT_ACTION = 'SYNCHRONIZE_MOVEMENT_ACTION';

export const isApiCompatible = (api: unknown | null): api is SynchronizeMovementActionApi =>
  Boolean(apiHasType(api));

export const synchronizeMovementAction = createAction<EmbeddableApiContext>({
  id: SYNCHRONIZE_MOVEMENT_ACTION,
  type: SYNCHRONIZE_MOVEMENT_ACTION,
  order: 21,
  getDisplayName: () => {
    return i18n.translate('xpack.maps.synchronizeMovementAction.title', {
      defaultMessage: 'Synchronize map movement',
    });
  },
  getDisplayNameTooltip: () => {
    return i18n.translate('xpack.maps.synchronizeMovementAction.tooltipContent', {
      defaultMessage:
        'Synchronize maps, so that if you zoom and pan in one map, the movement is reflected in other maps',
    });
  },
  getIconType: () => {
    return 'crosshairs';
  },
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) return false;
    const { isCompatible } = await import('./is_compatible');
    return isCompatible(embeddable);
  },
  execute: async () => {
    const { openModal } = await import('./modal');
    openModal();
  },
});
