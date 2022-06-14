/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Embeddable, EmbeddableInput, ViewMode } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

export const LINK_MAP_VIEW = 'LINK_MAP_VIEW';

interface LinkMapViewInput extends EmbeddableInput {
  linkMapView: boolean;
}

interface LinkMapViewActionContext {
  embeddable: Embeddable<LinkMapViewInput>;
}

export function getLinkMapView(input: { linkMapView?: boolean }) {
  return input.linkMapView === undefined ? true : input.linkMapView;
}

export const linkMapViewAction = createAction<LinkMapViewActionContext>({
  id: LINK_MAP_VIEW,
  type: LINK_MAP_VIEW,
  order: 21,
  getDisplayName: ({ embeddable }: LinkMapViewActionContext) => {
    return getLinkMapView(embeddable.getInput())
      ? i18n.translate('xpack.maps.linkMapView.disableDisplayName', {
          defaultMessage: 'Desynchronize map view',
        })
      : i18n.translate('xpack.maps.linkMapView.enableDisplayName', {
          defaultMessage: 'Synchronize map view',
        });
  },
  getDisplayNameTooltip: () => {
    return i18n.translate('xpack.maps.linkMapView.tooltipContent', {
      defaultMessage: 'Movement in one map panel moves all other maps panels',
    });
  },
  getIconType: () => {
    return 'crosshairs';
  },
  isCompatible: async ({ embeddable }: LinkMapViewActionContext) => {
    return (
      embeddable.type === MAP_SAVED_OBJECT_TYPE && embeddable.getInput().viewMode === ViewMode.EDIT
    );
  },
  execute: async ({ embeddable }: LinkMapViewActionContext) => {
    embeddable.updateInput({
      linkMapView: !getLinkMapView(embeddable.getInput()),
    });
  },
});
