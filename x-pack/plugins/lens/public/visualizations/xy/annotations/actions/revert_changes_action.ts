/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerAction, StateSetter } from '../../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../../types';

export const getRevertAction = ({
  state,
  layer,
  layerIndex,
  setState,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
}): LayerAction => {
  return {
    displayName: i18n.translate('xpack.lens.xyChart.annotations.revertChanges', {
      defaultMessage: 'Revert changes',
    }),
    description: i18n.translate('xpack.lens.xyChart.annotations.revertChangesDescription', {
      defaultMessage: 'Restores annotation group to the last saved state.',
    }),
    execute: () => {
      // TODO: open flyout ?
      // console.log('TODO: Revert changes action!');
    },
    icon: 'editorUndo',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_revertChanges',
  };
};
