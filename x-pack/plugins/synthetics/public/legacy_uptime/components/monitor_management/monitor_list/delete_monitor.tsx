/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';

import { useDispatch, useSelector } from 'react-redux';
import { deleteMonitorAction } from '../../../state/actions/delete_monitor';
import { AppState } from '../../../state';
import {
  ProjectMonitorDisclaimer,
  PROJECT_MONITOR_TITLE,
} from '../../../../apps/synthetics/components/monitors_page/management/monitor_list_table/delete_monitor';
import {
  deleteMonitorLoadingSelector,
  deleteMonitorSuccessSelector,
} from '../../../state/selectors';

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
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const isDeleting = useSelector((state: AppState) =>
    deleteMonitorLoadingSelector(state, configId)
  );

  const isSuccessfullyDeleted = useSelector((state: AppState) =>
    deleteMonitorSuccessSelector(state, configId)
  );

  const dispatch = useDispatch();

  const onConfirmDelete = () => {
    dispatch(deleteMonitorAction.get({ id: configId, name }));
    setIsDeleteModalVisible(false);
  };

  const showDeleteModal = () => setIsDeleteModalVisible(true);

  const handleDelete = () => {
    showDeleteModal();
  };

  useEffect(() => {
    if (isSuccessfullyDeleted) {
      onUpdate();
    }
  }, [onUpdate, isSuccessfullyDeleted]);

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
      <EuiButtonIcon
        isDisabled={isDisabled}
        iconType="trash"
        onClick={handleDelete}
        aria-label={DELETE_MONITOR_LABEL}
        data-test-subj="monitorManagementDeleteMonitor"
        isLoading={isDeleting}
      />

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
