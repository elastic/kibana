/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
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
import type { CoreStart } from '@kbn/core/public';
import type { LayerType } from '../../../..';
import type { LayerAction, Visualization } from '../../../../types';
import { getCloneLayerAction } from './clone_layer_action';
import { getRemoveLayerAction } from './remove_layer_action';
import { getOpenLayerSettingsAction } from './open_layer_settings';

export interface LayerActionsProps {
  layerIndex: number;
  actions: LayerAction[];
}

/** @internal **/
export const getSharedActions = ({
  core,
  layerIndex,
  layerType,
  activeVisualization,
  isOnlyLayer,
  isTextBasedLanguage,
  hasLayerSettings,
  openLayerSettings,
  onCloneLayer,
  onRemoveLayer,
}: {
  onRemoveLayer: () => void;
  onCloneLayer: () => void;
  layerIndex: number;
  layerId: string;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
  visualizationState: unknown;
  layerType?: LayerType;
  isTextBasedLanguage?: boolean;
  hasLayerSettings: boolean;
  openLayerSettings: () => void;
  core: Pick<CoreStart, 'overlays' | 'theme'>;
}) => [
  getOpenLayerSettingsAction({
    hasLayerSettings,
    openLayerSettings,
  }),
  getCloneLayerAction({
    execute: onCloneLayer,
    layerIndex,
    activeVisualization,
    isTextBasedLanguage,
  }),
  getRemoveLayerAction({
    execute: onRemoveLayer,
    layerIndex,
    layerType,
    isOnlyLayer,
    core,
  }),
];

/** @internal **/
const InContextMenuActions = (props: LayerActionsProps) => {
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
        panelProps={{
          'data-test-subj': 'lnsLayerActionsMenu',
        }}
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
  if (!props.actions.length) {
    return null;
  }

  if (props.actions.length > 1) {
    return <InContextMenuActions {...props} />;
  }
  const [{ displayName, execute, icon, color, 'data-test-subj': dataTestSubj }] = props.actions;

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
};
