/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import React from 'react';
import { ActionDefinition } from './table_type_configs';

interface ActionButtonProps {
  actions: ActionDefinition[];
  isPopoverVisible: boolean;
  actionHandler(action: string, payload?: any): void;
  hidePopover(): void;
  showPopover(): void;
}

export function ActionButton(props: ActionButtonProps) {
  const { actions, actionHandler, hidePopover, isPopoverVisible, showPopover } = props;

  if (actions.length === 0) {
    return null;
  } else if (actions.length === 1) {
    const action = actions[0];
    return (
      <EuiButton
        color={action.danger ? 'danger' : 'primary'}
        onClick={() => actionHandler(action.action)}
      >
        {action.name}
      </EuiButton>
    );
  }
  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={
        <EuiButton iconSide="right" iconType="arrowDown" onClick={showPopover}>
          Bulk Action
        </EuiButton>
      }
      closePopover={hidePopover}
      id="contextMenu"
      isOpen={isPopoverVisible}
      panelPaddingSize="none"
      withTitle
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: 'Bulk Actions',
            items: actions.map(action => ({
              ...action,
              onClick: () => actionHandler(action.action),
            })),
          },
        ]}
      />
    </EuiPopover>
  );
}
