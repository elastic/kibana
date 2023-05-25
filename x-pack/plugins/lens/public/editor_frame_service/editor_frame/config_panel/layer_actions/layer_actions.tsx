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
  useEuiTheme,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import type { LayerType } from '../../../..';
import type { LayerAction, Visualization } from '../../../../types';
import { getCloneLayerAction } from './clone_layer_action';
import { getRemoveLayerAction } from './remove_layer_action';
import { getOpenLayerSettingsAction } from './open_layer_settings';

export interface LayerActionsProps {
  layerIndex: number;
  actions: LayerAction[];
  mountingPoint?: HTMLDivElement | null | undefined;
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
  const { euiTheme } = useEuiTheme();

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    if (isPopoverOpen) {
      setPopover(false);
    }
  }, [isPopoverOpen]);

  const sortedActions = [...props.actions].sort(
    ({ order: order1 }, { order: order2 }) => order1 - order2
  );

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
          items={sortedActions.map((i) => (
            <EuiContextMenuItem
              icon={<EuiIcon type={i.icon} title={i.displayName} color={i.color} />}
              data-test-subj={i['data-test-subj']}
              aria-label={i.displayName}
              title={i.displayName}
              disabled={i.disabled}
              onClick={() => {
                closePopover();
                i.execute(props.mountingPoint);
              }}
              {...(i.color
                ? {
                    css: css`
                      color: ${euiTheme.colors[i.color]};
                    `,
                    size: 's', // need to be explicit here as css prop will disable the default small size
                  }
                : {})}
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
  const [{ displayName, execute, icon, color, 'data-test-subj': dataTestSubj, disabled }] =
    props.actions;

  return (
    <EuiButtonIcon
      size="xs"
      iconType={icon}
      color={color}
      data-test-subj={dataTestSubj}
      aria-label={displayName}
      title={displayName}
      disabled={disabled}
      onClick={() => execute?.(props.mountingPoint)}
    />
  );
};
