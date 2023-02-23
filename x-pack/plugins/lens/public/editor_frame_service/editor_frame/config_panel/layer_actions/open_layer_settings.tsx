/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerAction } from '../../../../types';

export const getOpenLayerSettingsAction = (props: {
  openLayerSettings: () => void;
  hasLayerSettings: boolean;
}): LayerAction => {
  const displayName = i18n.translate('xpack.lens.layerActions.layerSettingsAction', {
    defaultMessage: 'Layer settings',
  });

  return {
    id: 'openLayerSettings',
    displayName,
    execute: props.openLayerSettings,
    icon: 'gear',
    isCompatible: props.hasLayerSettings,
    'data-test-subj': 'lnsLayerSettings',
  };
};
