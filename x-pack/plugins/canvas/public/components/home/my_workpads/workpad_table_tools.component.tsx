/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { EuiButton, EuiToolTip, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { ComponentStrings } from '../../../../i18n';
import { ConfirmModal } from '../../confirm_modal';
import { FoundWorkpad } from '../../../services/workpad';

const { WorkpadTableTools: strings } = ComponentStrings;

export interface Props {
  workpads: FoundWorkpad[];
  canUserWrite: boolean;
  selectedWorkpadIds: string[];
  onDeleteWorkpads: (ids: string[]) => void;
  onExportWorkpads: (ids: string[]) => void;
}

export const WorkpadTableTools = ({
  workpads,
  canUserWrite,
  selectedWorkpadIds,
  onDeleteWorkpads,
  onExportWorkpads,
}: Props) => {
  const [isDeletePending, setIsDeletePending] = useState(false);

  const openRemoveConfirm = () => setIsDeletePending(true);
  const closeRemoveConfirm = () => setIsDeletePending(false);

  let deleteButton = (
    <EuiButton
      color="danger"
      iconType="trash"
      onClick={openRemoveConfirm}
      disabled={!canUserWrite}
      aria-label={strings.getDeleteButtonAriaLabel(selectedWorkpadIds.length)}
      data-test-subj="deleteWorkpadButton"
    >
      {strings.getDeleteButtonLabel(selectedWorkpadIds.length)}
    </EuiButton>
  );

  const downloadButton = (
    <EuiButton
      color="secondary"
      onClick={() => onExportWorkpads(selectedWorkpadIds)}
      iconType="exportAction"
      aria-label={strings.getExportButtonAriaLabel(selectedWorkpadIds.length)}
    >
      {strings.getExportButtonLabel(selectedWorkpadIds.length)}
    </EuiButton>
  );

  if (!canUserWrite) {
    deleteButton = (
      <EuiToolTip content={strings.getNoPermissionToDeleteToolTip()}>{deleteButton}</EuiToolTip>
    );
  }

  const modalTitle =
    selectedWorkpadIds.length === 1
      ? strings.getDeleteSingleWorkpadModalTitle(
          workpads.find((workpad) => workpad.id === selectedWorkpadIds[0])?.name || ''
        )
      : strings.getDeleteMultipleWorkpadModalTitle(selectedWorkpadIds.length + '');

  const confirmModal = (
    <ConfirmModal
      isOpen={isDeletePending}
      title={modalTitle}
      message={strings.getDeleteModalDescription()}
      confirmButtonText={strings.getDeleteModalConfirmButtonLabel()}
      onConfirm={() => {
        onDeleteWorkpads(selectedWorkpadIds);
        closeRemoveConfirm();
      }}
      onCancel={closeRemoveConfirm}
    />
  );

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>{downloadButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
      </EuiFlexGroup>
      {confirmModal}
    </Fragment>
  );
};
