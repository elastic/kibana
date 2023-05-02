/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { SynchronizeMovementActionContext } from './types';

export const SYNCHRONIZE_MOVEMENT_ACTION = 'SYNCHRONIZE_MOVEMENT_ACTION';

export const synchronizeMovementAction = createAction<SynchronizeMovementActionContext>({
  id: SYNCHRONIZE_MOVEMENT_ACTION,
  type: SYNCHRONIZE_MOVEMENT_ACTION,
  order: 21,
  getDisplayName: ({ embeddable }: SynchronizeMovementActionContext) => {
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
  isCompatible: async (context: SynchronizeMovementActionContext) => {
    const { isCompatible } = await import('./is_compatible');
    return isCompatible(context);
  },
  execute: async (context: SynchronizeMovementActionContext) => {
    const { openModal } = await import('./modal');
    openModal();
  },
});
