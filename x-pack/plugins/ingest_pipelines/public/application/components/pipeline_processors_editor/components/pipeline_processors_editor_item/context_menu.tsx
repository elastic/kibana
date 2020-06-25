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
  'data-test-subj'?: string;
}

export const ContextMenu: FunctionComponent<Props> = (props) => {
  const { showAddOnFailure, onDuplicate, onAddOnFailure, onDelete, disabled } = props;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const contextMenuItems = [
    <EuiContextMenuItem
      data-test-subj="duplicateButton"
      key="duplicate"
      icon="copy"
      onClick={() => {
        setIsOpen(false);
        onDuplicate();
      }}
    >
      {editorItemMessages.duplicateButtonLabel}
    </EuiContextMenuItem>,
    showAddOnFailure ? (
      <EuiContextMenuItem
        data-test-subj="addOnFailureButton"
        key="addOnFailure"
        icon="indexClose"
        onClick={() => {
          setIsOpen(false);
          onAddOnFailure();
        }}
      >
        {editorItemMessages.addOnFailureButtonLabel}
      </EuiContextMenuItem>
    ) : undefined,
    <EuiContextMenuItem
      data-test-subj="deleteButton"
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
      data-test-subj={props['data-test-subj']}
      anchorPosition="leftCenter"
      panelPaddingSize="none"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonIcon
          data-test-subj="button"
          disabled={disabled}
          onClick={() => setIsOpen((v) => !v)}
          iconType="boxesHorizontal"
          aria-label={editorItemMessages.moreButtonAriaLabel}
        />
      }
    >
      <EuiContextMenuPanel items={contextMenuItems} />
    </EuiPopover>
  );
};
