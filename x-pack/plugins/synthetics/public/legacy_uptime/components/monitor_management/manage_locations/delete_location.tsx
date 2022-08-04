/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiConfirmModal, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const DeleteLocation = ({
  loading,
  id,
  locationMonitors,
  onDelete,
}: {
  id: string;
  loading?: boolean;
  onDelete: (id: string) => void;
  locationMonitors: Array<{ id: string; count: number }>;
}) => {
  const monCount = locationMonitors?.find((l) => l.id === id)?.count ?? 0;
  const canDelete = monCount === 0;

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const deleteModal = (
    <EuiConfirmModal
      title={DELETE_LABEL}
      onCancel={() => setIsModalOpen(false)}
      onConfirm={() => onDelete(id)}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={CONFIRM_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>{ARE_YOU_SURE_LABEL}</p>
    </EuiConfirmModal>
  );

  return (
    <>
      {isModalOpen && deleteModal}
      <EuiToolTip
        content={
          canDelete
            ? DELETE_LABEL
            : i18n.translate('xpack.synthetics.monitorManagement.cannotDelete', {
                defaultMessage: `This location cannot be deleted, because it has {monCount} monitors running. Please remove this location from your monitors before deleting this location.`,
                values: { monCount },
              })
        }
      >
        <EuiButtonIcon
          isLoading={loading}
          iconType="trash"
          color="danger"
          aria-label={DELETE_LABEL}
          onClick={() => {
            setIsModalOpen(true);
          }}
          isDisabled={!canDelete || !canSave}
        />
      </EuiToolTip>
    </>
  );
};

const DELETE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.delete', {
  defaultMessage: 'Delete location',
});

const CONFIRM_LABEL = i18n.translate('xpack.synthetics.monitorManagement.deleteLocationLabel', {
  defaultMessage: 'Delete location',
});

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const ARE_YOU_SURE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.areYouSure', {
  defaultMessage: 'Are you sure you want to delete this location?',
});
