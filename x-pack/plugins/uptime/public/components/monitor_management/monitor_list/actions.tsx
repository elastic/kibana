/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { UptimeSettingsContext } from '../../../contexts';
import { useFetcher, FETCH_STATUS } from '../../../../../observability/public';
import { deleteMonitor } from '../../../state/api';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  id: string;
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Actions = ({ id, setRefresh }: Props) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { basePath } = useContext(UptimeSettingsContext);

  const { notifications } = useKibana();

  const { status } = useFetcher(() => {
    if (isDeleting) {
      return deleteMonitor({ id });
    }
  }, [id, isDeleting]);

  // TODO: add popup to confirm deletion
  const handleDelete = () => {
    setIsDeleting(true);
  };

  useEffect(() => {
    if (status === FETCH_STATUS.SUCCESS || status === FETCH_STATUS.FAILURE) {
      setIsDeleting(false);
    }
    if (status === FETCH_STATUS.FAILURE) {
      notifications.toasts.danger({
        title: <p data-test-subj="uptimeDeleteMonitorFailure">{MONITOR_DELETE_FAILURE_LABEL}</p>,
        toastLifeTimeMs: 3000,
      });
    } else if (status === FETCH_STATUS.SUCCESS) {
      setRefresh(true);
      notifications.toasts.success({
        title: <p data-test-subj="uptimeDeleteMonitorSuccess">{MONITOR_DELETE_SUCCESS_LABEL}</p>,
        toastLifeTimeMs: 3000,
      });
    }
  }, [setIsDeleting, setRefresh, notifications.toasts, status]);

  // TODO: Add popovers to icons
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="pencil"
          href={`${basePath}/app/uptime/edit-monitor/${Buffer.from(id, 'utf8').toString('base64')}`}
          aria-label={EDIT_MONITOR_LABEL}
          data-test-subj="monitorManagementEditMonitor"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {status === FETCH_STATUS.LOADING ? (
          <EuiLoadingSpinner size="m" aria-label={MONITOR_DELETE_LOADING_LABEL} />
        ) : (
          <EuiButtonIcon
            iconType="trash"
            onClick={handleDelete}
            aria-label={DELETE_MONITOR_LABEL}
            data-test-subj="monitorManagementDeleteMonitor"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const EDIT_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.editMonitorLabel', {
  defaultMessage: 'Edit monitor',
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
