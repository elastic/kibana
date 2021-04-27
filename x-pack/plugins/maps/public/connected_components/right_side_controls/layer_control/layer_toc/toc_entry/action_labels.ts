/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getVisibilityToggleIcon(isVisible: boolean) {
  return isVisible ? 'eyeClosed' : 'eye';
}

export function getVisibilityToggleLabel(isVisible: boolean) {
  return isVisible
    ? i18n.translate('xpack.maps.layerTocActions.hideLayerTitle', {
        defaultMessage: 'Hide layer',
      })
    : i18n.translate('xpack.maps.layerTocActions.showLayerTitle', {
        defaultMessage: 'Show layer',
      });
}

export const EDIT_LAYER_LABEL = i18n.translate(
  'xpack.maps.layerControl.layerTocActions.editButtonLabel',
  {
    defaultMessage: 'Edit layer',
  }
);

export const FIT_TO_DATA_LABEL = i18n.translate('xpack.maps.layerTocActions.fitToDataTitle', {
  defaultMessage: 'Fit to data',
});
