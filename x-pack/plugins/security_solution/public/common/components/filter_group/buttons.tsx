/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import { EuiButtonIcon, EuiCallOut, EuiPopover, EuiToolTip } from '@elastic/eui';
import { useFilterGroupInternalContext } from './hooks/use_filters';
import { DISCARD_CHANGES, PENDING_CHANGES_REMINDER } from './translations';

interface AddControlProps extends Partial<EuiButtonIconProps> {
  onClick: () => void;
}

export const AddControl: FC<AddControlProps> = ({ onClick, ...rest }) => {
  return (
    <EuiButtonIcon
      size="s"
      iconSize="m"
      display="base"
      data-test-subj={'filter-group__add-control'}
      onClick={onClick}
      {...rest}
      iconType={'plusInCircle'}
    />
  );
};

interface SaveControlsProps {
  onClick: () => void;
}

export const SaveControls: FC<SaveControlsProps> = ({ onClick }) => {
  const {
    hasPendingChanges,
    openPendingChangesPopover,
    closePendingChangesPopover,
    pendingChangesPopoverOpen,
  } = useFilterGroupInternalContext();

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          size="s"
          iconSize="m"
          display="base"
          color={'primary'}
          iconType={'save'}
          data-test-subj={'filter-group__save'}
          onClick={onClick}
          onFocus={openPendingChangesPopover}
          onBlur={closePendingChangesPopover}
          onMouseOver={openPendingChangesPopover}
          onMouseOut={closePendingChangesPopover}
          disabled={!hasPendingChanges}
        />
      }
      isOpen={pendingChangesPopoverOpen}
      anchorPosition={'upCenter'}
      panelPaddingSize="none"
      closePopover={closePendingChangesPopover}
      panelProps={{
        'data-test-subj': 'filter-group__save-popover',
      }}
    >
      <div style={{ maxWidth: '200px' }}>
        <EuiCallOut title={PENDING_CHANGES_REMINDER} color="warning" iconType="alert" size="s" />
      </div>
    </EuiPopover>
  );
};

interface DiscardChangesProps {
  onClick: () => void;
}

export const DiscardChanges: FC<DiscardChangesProps> = ({ onClick }) => {
  return (
    <EuiToolTip content={DISCARD_CHANGES} position="top" display="block">
      <EuiButtonIcon
        size="s"
        iconSize="m"
        display="base"
        color="danger"
        iconType={'minusInCircle'}
        data-test-subj={'filter-group__discard'}
        onClick={onClick}
      />
    </EuiToolTip>
  );
};
