/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { FunctionComponent, useState } from 'react';

import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover, EuiButtonIcon } from '@elastic/eui';

import { i18nTexts } from './i18n_texts';

interface Props {
  disabled: boolean;
  hidden: boolean;
  showAddOnFailure: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddOnFailure: () => void;
  'data-test-subj'?: string;
}

export const ContextMenu: FunctionComponent<Props> = (props) => {
  const { showAddOnFailure, onDuplicate, onAddOnFailure, onDelete, disabled, hidden } = props;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const containerClasses = classNames({
    'pipelineProcessorsEditor__item--displayNone': hidden,
  });

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
      {i18nTexts.duplicateButtonLabel}
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
        {i18nTexts.addOnFailureButtonLabel}
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
      {i18nTexts.deleteButtonLabel}
    </EuiContextMenuItem>,
  ].filter(Boolean) as JSX.Element[];

  return (
    <div className={containerClasses}>
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
            aria-label={i18nTexts.moreButtonAriaLabel}
          />
        }
      >
        <EuiContextMenuPanel items={contextMenuItems} />
      </EuiPopover>
    </div>
  );
};
