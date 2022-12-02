/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  ProjectMonitorDisclaimer,
  PROJECT_MONITOR_TITLE,
} from '../../../../apps/synthetics/components/monitors_page/management/monitor_list_table/delete_monitor';
import { deleteMonitor } from '../../../state/api';
import { kibanaService } from '../../../state/kibana_service';

export const DeleteMonitor = ({
  configId,
  name,
  onUpdate,
  isDisabled,
  isProjectMonitor,
}: {
  configId: string;
  name: string;
  isDisabled?: boolean;
  isProjectMonitor?: boolean;
  onUpdate: () => void;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(FETCH_STATUS.PENDING);

  const onConfirmDelete = () => {
    setIsDeleting(true);
    setIsDeleteModalVisible(false);
  };
  const showDeleteModal = () => setIsDeleteModalVisible(true);

  const { status } = useFetcher(() => {
    if (isDeleting) {
      return deleteMonitor({ id: configId });
    }
  }, [configId, isDeleting]);

  const handleDelete = () => {
    showDeleteModal();
  };

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    if (isDeleting && fetchStatus !== status) {
      setFetchStatus(status);
      return;
    }
    if (fetchStatus === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">{MONITOR_DELETE_FAILURE_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
      setFetchStatus(FETCH_STATUS.PENDING);
      setIsDeleting(false);
    } else if (fetchStatus === FETCH_STATUS.SUCCESS) {
      onUpdate();
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">
              {i18n.translate(
                'xpack.synthetics.monitorManagement.monitorDeleteSuccessMessage.name',
                {
                  defaultMessage: 'Deleted "{name}"',
                  values: { name },
                }
              )}
            </p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
      setFetchStatus(FETCH_STATUS.PENDING);
      setIsDeleting(false);
    }
  }, [setIsDeleting, onUpdate, status, name, isDeleting, fetchStatus]);

  const destroyModal = (
    <EuiConfirmModal
      title={i18n.translate('xpack.synthetics.monitorManagement.deleteMonitorNameLabel', {
        defaultMessage: 'Delete "{name}" monitor?',
        values: { name },
      })}
      onCancel={() => setIsDeleteModalVisible(false)}
      onConfirm={onConfirmDelete}
      cancelButtonText={NO_LABEL}
      confirmButtonText={YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      {isProjectMonitor && (
        <>
          <EuiCallOut color="warning" iconType="help" title={PROJECT_MONITOR_TITLE}>
            <p>
              <ProjectMonitorDisclaimer />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
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

const YES_LABEL = i18n.translate('xpack.synthetics.monitorManagement.yesLabel', {
  defaultMessage: 'Delete',
});

const NO_LABEL = i18n.translate('xpack.synthetics.monitorManagement.noLabel', {
  defaultMessage: 'Cancel',
});

const DELETE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.deleteMonitorLabel',
  {
    defaultMessage: 'Delete monitor',
  }
);

// TODO: Discuss error states with product
const MONITOR_DELETE_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorDeleteFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be deleted. Please try again later.',
  }
);

const MONITOR_DELETE_LOADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorDeleteLoadingMessage',
  {
    defaultMessage: 'Deleting monitor...',
  }
);
