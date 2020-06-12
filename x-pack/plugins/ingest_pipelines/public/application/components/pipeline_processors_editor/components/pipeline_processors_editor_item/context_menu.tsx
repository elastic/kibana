/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';

import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover, EuiButtonIcon } from '@elastic/eui';

import { editorItemMessages } from './messages';

interface Props {
  disabled: boolean;
  showAddOnFailure: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddOnFailure: () => void;
}

export const ContextMenu: FunctionComponent<Props> = ({
  showAddOnFailure,
  onDuplicate,
  onAddOnFailure,
  onDelete,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const contextMenuItems = [
    <EuiContextMenuItem
      key="duplicate"
      icon="copy"
      onClick={() => {
        setIsOpen(false);
        onDuplicate();
      }}
    >
      {editorItemMessages.duplicateButtonLabel}
    </EuiContextMenuItem>,
    showAddOnFailure ? undefined : (
      <EuiContextMenuItem
        key="addOnFailure"
        icon="indexClose"
        onClick={() => {
          setIsOpen(false);
          onAddOnFailure();
        }}
      >
        {editorItemMessages.addOnFailureButtonLabel}
      </EuiContextMenuItem>
    ),
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      color="danger"
      onClick={() => {
        setIsOpen(false);
        onDelete();
      }}
    >
      {editorItemMessages.deleteButtonLabel}
    </EuiContextMenuItem>,
  ].filter(Boolean) as JSX.Element[];

  return (
    <EuiPopover
      anchorPosition="leftCenter"
      panelPaddingSize="none"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonIcon
          disabled={disabled}
          onClick={() => setIsOpen((v) => !v)}
          iconType="boxesHorizontal"
          aria-label={editorItemMessages.moreButtonAriaLabel}
        />
      }
    >
      <EuiContextMenuPanel items={contextMenuItems} />;
    </EuiPopover>
  );
};
