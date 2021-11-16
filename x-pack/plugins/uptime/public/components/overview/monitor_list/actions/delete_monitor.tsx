/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButtonIcon, EuiConfirmModal, EuiLoadingSpinner } from '@elastic/eui';
import { useState } from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { uptimeMonitorType } from './monitor_config_flyout';
import { useUptimeRefreshContext } from '../../../../contexts/uptime_refresh_context';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';

interface Props {
  monitorId: string;
}
export const DeleteMonitor = ({ monitorId }: Props) => {
  const {
    services: { savedObjects },
  } = useKibana();

  const [loading, setLoading] = useState(false);
  const [isDestroyModalVisible, setIsDestroyModalVisible] = useState(false);

  const closeDestroyModal = () => setIsDestroyModalVisible(false);
  const showDestroyModal = () => setIsDestroyModalVisible(true);

  const { refreshApp } = useUptimeRefreshContext();

  const onDelete = async () => {
    closeDestroyModal();
    setLoading(true);
    // await savedObjects?.client.delete(uptimeMonitorType, monitorId);
    await apiService.get(API_URLS.DELETE_CONFIG, { monitorId });
    setLoading(false);
    refreshApp();
  };

  if (loading) {
    return <EuiLoadingSpinner />;
  }
  let destroyModal;
  if (isDestroyModalVisible) {
    destroyModal = (
      <EuiConfirmModal
        title="Delete monitor"
        onCancel={closeDestroyModal}
        onConfirm={onDelete}
        cancelButtonText="No, don't do it"
        confirmButtonText="Yes, do it"
        buttonColor="danger"
        defaultFocusedButton="confirm"
      >
        <p>You are about to delete monitor {monitorId}.</p>
        <p>Are you sure you want to do this?</p>
      </EuiConfirmModal>
    );
  }
  return (
    <>
      <EuiButtonIcon
        color="danger"
        iconType="trash"
        onClick={() => {
          showDestroyModal();
        }}
      />
      {destroyModal}
    </>
  );
};
