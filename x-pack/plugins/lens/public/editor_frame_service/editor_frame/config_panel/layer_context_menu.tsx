/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useGeneratedHtmlId,
  EuiContextMenuItem,
  EuiIcon,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { LayerAction } from '../../../types';
import { getRemoveLayerActionDefinition, RemoveLayerButtonProps } from './remove_layer_button';

export function LayerContextMenu({
  actions,
  removeAction,
}: {
  actions: LayerAction[];
  removeAction: RemoveLayerButtonProps;
}) {
  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'layerContextMenu',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const { name: removeLabel, ...removeActionDef } = getRemoveLayerActionDefinition(removeAction);

  const items = [
    ...actions.map(({ id, name, fn, icon }) => {
      return (
        <EuiContextMenuItem key={id} icon={icon} onClick={fn}>
          {name}
        </EuiContextMenuItem>
      );
    }),
    <EuiContextMenuItem
      key={removeActionDef.id}
      icon={<EuiIcon type={removeActionDef.icon} size="m" color={removeActionDef.color} />}
      onClick={removeActionDef.fn}
    >
      {removeLabel}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={
        <EuiButtonIcon
          onClick={onButtonClick}
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.lens.editorFrame.layerContextMenu', {
            defaultMessage: 'Layer actions',
          })}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
}
