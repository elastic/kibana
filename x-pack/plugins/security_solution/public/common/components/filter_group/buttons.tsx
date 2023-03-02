/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiCallOut, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { useFilterGroupInternalContext } from './hooks/use_filters';
import { DISCARD_CHANGES, PENDING_CHANGES_REMINDER } from './translations';

export const AddControl = () => {
  const { controlGroup } = useFilterGroupInternalContext();

  return (
    <EuiButtonIcon
      size="s"
      iconSize="m"
      display="base"
      iconType={'plusInCircle'}
      data-test-subj={'filter-group__add-control'}
      onClick={() => controlGroup?.openAddDataControlFlyout()}
    />
  );
};

export const SaveControls = () => {
  const {
    switchToViewMode,
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
          color={hasPendingChanges ? 'danger' : 'primary'}
          iconType={'save'}
          data-test-subj={'filter-group__save'}
          onClick={switchToViewMode}
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
        <EuiCallOut title={PENDING_CHANGES_REMINDER} color="warning" iconType="alert" />
      </div>
    </EuiPopover>
  );
};

interface DiscardChangesProps {
  getStoredControlInput: () => ControlGroupInput | undefined;
}

export const DiscardChanges = ({ getStoredControlInput }: DiscardChangesProps) => {
  const { switchToViewMode, hasPendingChanges, controlGroup } = useFilterGroupInternalContext();

  const discardChangesHandler = useCallback(() => {
    if (hasPendingChanges) {
      controlGroup?.updateInput({
        panels: getStoredControlInput()?.panels,
      });
    }

    switchToViewMode();
  }, [controlGroup, switchToViewMode, getStoredControlInput, hasPendingChanges]);

  return (
    <EuiToolTip content={DISCARD_CHANGES} position="top" display="block">
      <EuiButtonIcon
        size="s"
        iconSize="m"
        display="base"
        color="danger"
        iconType={'minusInCircle'}
        data-test-subj={'filter-group__discard'}
        onClick={discardChangesHandler}
      />
    </EuiToolTip>
  );
};
