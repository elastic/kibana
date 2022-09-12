/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import { Visualization } from '../../../..';
import { LayerButtonsAction } from './types';

interface CloneLayerButtonProps {
  onCloneLayer: () => void;
  layerIndex: number;
  closeContextMenu: () => void;
}

export const getCloneLayerButtonAction = (props: {
  execute: () => void;
  layerIndex: number;
  activeVisualization: Visualization;
}): LayerButtonsAction => {
  const displayName = i18n.translate('xpack.lens.cloneLayerAriaLabel', {
    defaultMessage: 'Clone layer {index}',
    values: { index: props.layerIndex + 1 },
  });

  return {
    execute: props.execute,
    displayName,
    isCompatible: true || Boolean(props.activeVisualization.cloneLayer),
    icon: 'copy',
  };
};

export function CloneLayerButton({
  layerIndex,
  onCloneLayer,
  closeContextMenu,
}: CloneLayerButtonProps) {
  const cloneLayer = useCallback(() => {
    closeContextMenu();
    onCloneLayer();
  }, [closeContextMenu, onCloneLayer]);

  const ariaLabel = i18n.translate('xpack.lens.cloneLayerAriaLabel', {
    defaultMessage: 'Clone layer {index}',
    values: { index: layerIndex + 1 },
  });

  return (
    <>
      <EuiContextMenuItem
        icon={<EuiIcon type="copy" title={ariaLabel} />}
        data-test-subj="lnsLayerClone"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={cloneLayer}
      >
        {ariaLabel}
      </EuiContextMenuItem>
    </>
  );
}
