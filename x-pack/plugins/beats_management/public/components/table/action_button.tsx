/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiContextMenu, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React from 'react';
import { ActionDefinition } from './table_type_configs';

interface ActionButtonProps {
  actions: ActionDefinition[];
  isPopoverVisible: boolean;
  actionHandler(action: string, payload?: any): void;
  hidePopover(): void;
  showPopover(): void;
}

const Action = (props: {
  action: string;
  danger?: boolean;
  name: string;
  actionHandler(action: string, payload?: any): void;
}) => {
  const { action, actionHandler, danger, name } = props;
  return (
    <EuiButton color={danger ? 'danger' : 'primary'} onClick={() => actionHandler(action)}>
      {name}
    </EuiButton>
  );
};

export function ActionButton(props: ActionButtonProps) {
  const { actions, actionHandler, hidePopover, isPopoverVisible, showPopover } = props;
  if (actions.length === 0) {
    return null;
  } else if (actions.length <= 2) {
    return (
      <EuiFlexGroup>
        {actions.map(({ action, danger, name }) => (
          <EuiFlexItem key={action} grow={false}>
            <Action action={action} actionHandler={actionHandler} danger={danger} name={name} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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
