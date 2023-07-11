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
import {
  ADD_CONTROLS,
  ADD_CONTROLS_MAX_LIMIT,
  PENDING_CHANGES_REMINDER,
  SAVE_CHANGES,
} from './translations';
import { TEST_IDS } from './constants';

interface AddControlProps extends Partial<EuiButtonIconProps> {
  onClick: () => void;
}

export const AddControl: FC<AddControlProps> = ({ onClick, ...rest }) => {
  const { isDisabled } = rest;
  return (
    <EuiToolTip content={isDisabled ? ADD_CONTROLS_MAX_LIMIT : ADD_CONTROLS}>
      <EuiButtonIcon
        size="s"
        iconSize="m"
        display="base"
        aria-label={isDisabled ? ADD_CONTROLS_MAX_LIMIT : ADD_CONTROLS}
        data-test-subj={TEST_IDS.ADD_CONTROL}
        onClick={onClick}
        {...rest}
        iconType="plusInCircle"
      />
    </EuiToolTip>
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
          aria-label={SAVE_CHANGES}
          size="s"
          iconSize="m"
          display="base"
          color="primary"
          iconType="save"
          data-test-subj={TEST_IDS.SAVE_CONTROL}
          onClick={onClick}
          onFocus={openPendingChangesPopover}
          onBlur={closePendingChangesPopover}
          onMouseOver={openPendingChangesPopover}
          onMouseOut={closePendingChangesPopover}
          disabled={!hasPendingChanges}
        />
      }
      isOpen={pendingChangesPopoverOpen}
      anchorPosition="upCenter"
      panelPaddingSize="none"
      closePopover={closePendingChangesPopover}
      panelProps={{
        'data-test-subj': TEST_IDS.SAVE_CHANGE_POPOVER,
      }}
    >
      <div style={{ maxWidth: '200px' }}>
        <EuiCallOut title={PENDING_CHANGES_REMINDER} color="warning" iconType="alert" size="s" />
      </div>
    </EuiPopover>
  );
};
