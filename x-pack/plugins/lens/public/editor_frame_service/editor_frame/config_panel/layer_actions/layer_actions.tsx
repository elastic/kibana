/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiContextMenuItem,
  EuiIcon,
  EuiText,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import type { LayerType, Visualization } from '../../../..';
import type { LayerAction } from './types';

import { getCloneLayerAction } from './clone_layer_action';
import { getRemoveLayerAction } from './remove_layer_action';

export interface LayerActionsProps {
  onRemoveLayer: () => void;
  onCloneLayer: () => void;
  layerIndex: number;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
  layerType?: LayerType;
  isTextBasedLanguage?: boolean;
  core: Pick<CoreStart, 'overlays' | 'theme'>;
}

/** @internal **/
const InContextMenuActions = (
  props: LayerActionsProps & {
    actions: LayerAction[];
  }
) => {
  const dataTestSubject = `lnsLayerSplitButton--${props.layerIndex}`;
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: dataTestSubject,
  });

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    if (isPopoverOpen) {
      setPopover(false);
    }
  }, [isPopoverOpen]);

  return (
    <EuiOutsideClickDetector onOutsideClick={closePopover}>
      <EuiPopover
        id={splitButtonPopoverId}
        button={
          <EuiButtonIcon
            display="empty"
            color="text"
            size="s"
            iconType="boxesHorizontal"
            aria-label={i18n.translate('xpack.lens.layer.actions.contextMenuAriaLabel', {
              defaultMessage: `Layer actions`,
            })}
            onClick={onButtonClick}
            data-test-subj={dataTestSubject}
          />
        }
        ownFocus={true}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="s"
          items={props.actions.map((i) => (
            <EuiContextMenuItem
              icon={<EuiIcon type={i.icon} title={i.displayName} color={i.color} />}
              data-test-subj={i['data-test-subj']}
              aria-label={i.displayName}
              title={i.displayName}
              onClick={() => {
                closePopover();
                i.execute();
              }}
            >
              <EuiText size={'s'} color={i.color}>
                {i.displayName}
              </EuiText>
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    </EuiOutsideClickDetector>
  );
};

export const LayerActions = (props: LayerActionsProps) => {
  const compatibleActions = useMemo(
    () =>
      [
        getCloneLayerAction({
          execute: props.onCloneLayer,
          layerIndex: props.layerIndex,
          activeVisualization: props.activeVisualization,
          isTextBasedLanguage: props.isTextBasedLanguage,
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
  }

  if (compatibleActions.length > 1) {
    return <InContextMenuActions {...props} actions={compatibleActions} />;
  } else {
    const [{ displayName, execute, icon, color, 'data-test-subj': dataTestSubj }] =
      compatibleActions;

    return (
      <EuiButtonIcon
        size="xs"
        iconType={icon}
        color={color}
        data-test-subj={dataTestSubj}
        aria-label={displayName}
        title={displayName}
        onClick={execute}
      />
    );
  }
};
