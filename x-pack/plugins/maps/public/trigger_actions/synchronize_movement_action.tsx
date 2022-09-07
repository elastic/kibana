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
import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { isLegacyMap } from '../legacy_visualizations';
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
      defaultMessage:
        'Synchronize maps, so that if you zoom and pan in one map, the movement is reflected in other maps',
    });
  },
  getIconType: () => {
    return 'crosshairs';
  },
  isCompatible: async ({ embeddable }: SynchronizeMovementActionContext) => {
    const { mapEmbeddablesSingleton } = await import('../embeddable/map_embeddables_singleton');
    if (!mapEmbeddablesSingleton.hasMultipleMaps()) {
      return false;
    }

    if (
      embeddable.type === 'lens' &&
      typeof (embeddable as LensEmbeddable).getSavedVis === 'function' &&
      (embeddable as LensEmbeddable).getSavedVis()?.visualizationType === 'lnsChoropleth'
    ) {
      return true;
    }

    if (isLegacyMap(embeddable)) {
      return true;
    }

    return embeddable.type === MAP_SAVED_OBJECT_TYPE;
  },
  execute: async ({ embeddable }: SynchronizeMovementActionContext) => {
    const { SynchronizeMovementModal } = await import('./synchronize_movement_modal');
    const { openModal } = createReactOverlays(getCore());
    const modalSession = openModal(
      <SynchronizeMovementModal onClose={() => modalSession.close()} />
    );
  },
});
