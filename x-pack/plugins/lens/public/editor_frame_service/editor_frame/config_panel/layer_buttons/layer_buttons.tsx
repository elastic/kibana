/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiContextMenuItem,
  EuiIcon,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import type { LayerType, Visualization } from '../../../..';
import type { LayerButtonsAction } from './types';

import { getCloneLayerAction } from './clone_layer_button';
import { getRemoveLayerAction } from './remove_layer_button';

export interface LayerButtonsProps {
  onRemoveLayer: () => void;
  onCloneLayer: () => void;
  layerIndex: number;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
  layerType?: LayerType;
  core: Pick<CoreStart, 'overlays' | 'theme'>;
}

/** @internal **/
const InContextMenuActions = (
  props: LayerButtonsProps & {
    actions: LayerButtonsAction[];
  }
) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    if (isPopoverOpen) {
      setPopover(false);
    }
  }, [isPopoverOpen]);

  const items = props.actions.map((i) => (
    <EuiContextMenuItem
      icon={<EuiIcon type={i.icon} title={i.displayName} color={i.color} />}
      data-test-subj="lnsLayerClone"
      aria-label={i.displayName}
      title={i.displayName}
      onClick={() => {
        closePopover();
        i.execute();
      }}
    >
      {i.displayName}
    </EuiContextMenuItem>
  ));

  return (
    <EuiOutsideClickDetector onOutsideClick={closePopover}>
      <EuiPopover
        id={splitButtonPopoverId}
        button={
          <EuiButtonIcon
            display="empty"
            color="text"
            size="s"
            iconType="boxesVertical"
            aria-label={i18n.translate('xpack.lens.layer.actions.contextMenuAriaLabel', {
              defaultMessage: `Layer actions`,
            })}
            onClick={onButtonClick}
          />
        }
        ownFocus={true}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    </EuiOutsideClickDetector>
  );
};

export const LayerButtons = (props: LayerButtonsProps) => {
  const compatibleActions = useMemo(
    () =>
      [
        getCloneLayerAction({
          execute: props.onCloneLayer,
          layerIndex: props.layerIndex,
          activeVisualization: props.activeVisualization,
        }),
        getRemoveLayerAction({
          execute: props.onRemoveLayer,
          layerIndex: props.layerIndex,
          activeVisualization: props.activeVisualization,
          layerType: props.layerType,
          isOnlyLayer: props.isOnlyLayer,
          core: props.core,
        }),
      ].filter((i) => i.isCompatible),
    [props]
  );

  if (!compatibleActions.length) {
    return null;
  } else {
    if (compatibleActions.length > 1) {
      return <InContextMenuActions {...props} actions={compatibleActions} />;
    } else {
      const { displayName, execute, icon, color } = compatibleActions[0];
      return (
        <EuiButtonIcon
          size="xs"
          iconType={icon}
          color={color}
          data-test-subj="lnsLayerRemove"
          aria-label={displayName}
          title={displayName}
          onClick={execute}
        />
      );
    }
  }
};
