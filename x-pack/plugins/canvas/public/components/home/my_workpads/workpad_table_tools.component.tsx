/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiToolTip, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { ConfirmModal } from '../../confirm_modal';
import { FoundWorkpad } from '../../../services/workpad';

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
      color="success"
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

const strings = {
  getDeleteButtonAriaLabel: (numberOfWorkpads: number) =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteButtonAriaLabel', {
      defaultMessage: 'Delete {numberOfWorkpads} workpads',
      values: {
        numberOfWorkpads,
      },
    }),
  getDeleteButtonLabel: (numberOfWorkpads: number) =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteButtonLabel', {
      defaultMessage: 'Delete ({numberOfWorkpads})',
      values: {
        numberOfWorkpads,
      },
    }),
  getDeleteModalConfirmButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteModalConfirmButtonLabel', {
      defaultMessage: 'Delete',
    }),
  getDeleteModalDescription: () =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteModalDescription', {
      defaultMessage: `You can't recover deleted workpads.`,
    }),
  getDeleteMultipleWorkpadModalTitle: (numberOfWorkpads: string) =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteMultipleWorkpadsModalTitle', {
      defaultMessage: 'Delete {numberOfWorkpads} workpads?',
      values: {
        numberOfWorkpads,
      },
    }),
  getDeleteSingleWorkpadModalTitle: (workpadName: string) =>
    i18n.translate('xpack.canvas.workpadTableTools.deleteSingleWorkpadModalTitle', {
      defaultMessage: `Delete workpad '{workpadName}'?`,
      values: {
        workpadName,
      },
    }),
  getExportButtonAriaLabel: (numberOfWorkpads: number) =>
    i18n.translate('xpack.canvas.workpadTableTools.exportButtonAriaLabel', {
      defaultMessage: 'Export {numberOfWorkpads} workpads',
      values: {
        numberOfWorkpads,
      },
    }),
  getExportButtonLabel: (numberOfWorkpads: number) =>
    i18n.translate('xpack.canvas.workpadTableTools.exportButtonLabel', {
      defaultMessage: 'Export ({numberOfWorkpads})',
      values: {
        numberOfWorkpads,
      },
    }),
  getNoPermissionToCreateToolTip: () =>
    i18n.translate('xpack.canvas.workpadTableTools.noPermissionToCreateToolTip', {
      defaultMessage: `You don't have permission to create workpads`,
    }),
  getNoPermissionToDeleteToolTip: () =>
    i18n.translate('xpack.canvas.workpadTableTools.noPermissionToDeleteToolTip', {
      defaultMessage: `You don't have permission to delete workpads`,
    }),
  getNoPermissionToUploadToolTip: () =>
    i18n.translate('xpack.canvas.workpadTableTools.noPermissionToUploadToolTip', {
      defaultMessage: `You don't have permission to upload workpads`,
    }),
};
