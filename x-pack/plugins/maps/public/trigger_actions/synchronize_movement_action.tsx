/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { createReactOverlays } from '@kbn/kibana-react-plugin/public';
import { Embeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { getCore } from '../kibana_services';

export const SYNCHRONIZE_MOVEMENT_ACTION = 'SYNCHRONIZE_MOVEMENT_ACTION';

interface SynchronizeMovementActionContext {
  embeddable: Embeddable<EmbeddableInput>;
}

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
      defaultMessage: 'Configure movement between map panels',
    });
  },
  getIconType: () => {
    return 'crosshairs';
  },
  isCompatible: async ({ embeddable }: SynchronizeMovementActionContext) => {
    const { synchronizeMovement } = await import('../embeddable/synchronize_movement');
    return synchronizeMovement.hasMultipleMaps() && embeddable.type === MAP_SAVED_OBJECT_TYPE;
  },
  execute: async ({ embeddable }: SynchronizeMovementActionContext) => {
    const { SynchronizeMovementModal } = await import('./synchronize_movement_modal');
    const { openModal } = createReactOverlays(getCore());
    const modalSession = openModal(
      <SynchronizeMovementModal onClose={() => modalSession.close()} />
    );
  },
});
