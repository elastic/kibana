/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Visualization } from '../../../..';
import { LayerAction } from './types';

interface CloneLayerAction {
  execute: () => void;
  layerIndex: number;
  activeVisualization: Visualization;
}

export const getCloneLayerAction = (props: CloneLayerAction): LayerAction => {
  const displayName = i18n.translate('xpack.lens.cloneLayerAriaLabel', {
    defaultMessage: 'Duplicate layer',
  });

  return {
    execute: props.execute,
    displayName,
    isCompatible: Boolean(props.activeVisualization.cloneLayer),
    icon: 'copy',
    'data-test-subj': `lnsLayerClone--${props.layerIndex}`,
  };
};
