/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { fetchDeleteMonitor } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { PROJECT_MONITOR_DISCLAIMER } from './actions';
import * as labels from './labels';

export const DeleteMonitor = ({
  id,
  name,
  reloadPage,
  isProjectMonitor,
  setIsDeleteModalVisible,
}: {
  id: string;
  name: string;
  reloadPage: () => void;
  isProjectMonitor?: boolean;
  setIsDeleteModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    setIsDeleting(true);
  };

  const { status: monitorDeleteStatus } = useFetcher(() => {
    if (isDeleting) {
      return fetchDeleteMonitor({ id });
    }
  }, [id, isDeleting]);

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    if (monitorDeleteStatus === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">{labels.MONITOR_DELETE_FAILURE_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (monitorDeleteStatus === FETCH_STATUS.SUCCESS) {
      reloadPage();
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">{labels.MONITOR_DELETE_SUCCESS_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    }
    if (
      monitorDeleteStatus === FETCH_STATUS.SUCCESS ||
      monitorDeleteStatus === FETCH_STATUS.FAILURE
    ) {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
    }
  }, [setIsDeleting, isDeleting, reloadPage, monitorDeleteStatus, setIsDeleteModalVisible]);

  return (
    <EuiConfirmModal
      title={`${labels.DELETE_MONITOR_LABEL} ${name}`}
      onCancel={() => setIsDeleteModalVisible(false)}
      onConfirm={handleConfirmDelete}
      cancelButtonText={labels.NO_LABEL}
      confirmButtonText={labels.YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isDeleting}
    >
      {isProjectMonitor && (
        <>
          <EuiCallOut color="warning" iconType="help">
            <p>{PROJECT_MONITOR_DISCLAIMER}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <p>{labels.DELETE_DESCRIPTION_LABEL}</p>
    </EuiConfirmModal>
  );
};
