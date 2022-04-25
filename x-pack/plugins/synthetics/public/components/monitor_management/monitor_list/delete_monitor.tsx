/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiConfirmModal, EuiLoadingSpinner } from '@elastic/eui';

import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { deleteMonitor } from '../../../state/api';
import { kibanaService } from '../../../state/kibana_service';

export const DeleteMonitor = ({
  id,
  name,
  onUpdate,
  isDisabled,
}: {
  id: string;
  name: string;
  isDisabled?: boolean;
  onUpdate: () => void;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const onConfirmDelete = () => {
    setIsDeleting(true);
    setIsDeleteModalVisible(false);
  };
  const showDeleteModal = () => setIsDeleteModalVisible(true);

  const { status } = useFetcher(() => {
    if (isDeleting) {
      return deleteMonitor({ id });
    }
  }, [id, isDeleting]);

  const handleDelete = () => {
    showDeleteModal();
  };

  useEffect(() => {
    if (status === FETCH_STATUS.SUCCESS || status === FETCH_STATUS.FAILURE) {
      setIsDeleting(false);
    }
    if (status === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">{MONITOR_DELETE_FAILURE_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (status === FETCH_STATUS.SUCCESS) {
      onUpdate();
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">{MONITOR_DELETE_SUCCESS_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    }
  }, [setIsDeleting, onUpdate, status]);

  const destroyModal = (
    <EuiConfirmModal
      title={`${DELETE_MONITOR_LABEL} ${name}`}
      onCancel={() => setIsDeleteModalVisible(false)}
      onConfirm={onConfirmDelete}
      cancelButtonText={NO_LABEL}
      confirmButtonText={YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>{DELETE_DESCRIPTION_LABEL}</p>
    </EuiConfirmModal>
  );

  return (
    <>
      {status === FETCH_STATUS.LOADING ? (
        <EuiLoadingSpinner size="m" aria-label={MONITOR_DELETE_LOADING_LABEL} />
      ) : (
        <EuiButtonIcon
          isDisabled={isDisabled}
          iconType="trash"
          onClick={handleDelete}
          aria-label={DELETE_MONITOR_LABEL}
          data-test-subj="monitorManagementDeleteMonitor"
        />
      )}
      {isDeleteModalVisible && destroyModal}
    </>
  );
};

const DELETE_DESCRIPTION_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.confirmDescriptionLabel',
  {
    defaultMessage:
      'This action will delete the monitor but keep any data collected. This action cannot be undone.',
  }
);

const YES_LABEL = i18n.translate('xpack.uptime.monitorManagement.yesLabel', {
  defaultMessage: 'Delete',
});

const NO_LABEL = i18n.translate('xpack.uptime.monitorManagement.noLabel', {
  defaultMessage: 'Cancel',
});

const DELETE_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.deleteMonitorLabel', {
  defaultMessage: 'Delete monitor',
});

const MONITOR_DELETE_SUCCESS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorDeleteSuccessMessage',
  {
    defaultMessage: 'Monitor deleted successfully.',
  }
);

// TODO: Discuss error states with product
const MONITOR_DELETE_FAILURE_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorDeleteFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be deleted. Please try again later.',
  }
);

const MONITOR_DELETE_LOADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorDeleteLoadingMessage',
  {
    defaultMessage: 'Deleting monitor...',
  }
);
