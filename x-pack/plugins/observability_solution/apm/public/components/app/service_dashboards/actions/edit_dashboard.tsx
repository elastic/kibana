/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SaveDashboardModal } from './save_dashboard_modal';
import { MergedServiceDashboard } from '..';

export function EditDashboard({
  onRefresh,
  currentDashboard,
  serviceName,
}: {
  onRefresh: () => void;
  currentDashboard: MergedServiceDashboard;
  serviceName: string;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  return (
    <>
      <EuiButtonEmpty
        color="text"
        size="s"
        iconType={'pencil'}
        data-test-subj="apmEditServiceDashboardMenu"
        onClick={() => setIsModalVisible(!isModalVisible)}
      >
        {i18n.translate('xpack.apm.serviceDashboards.editEmptyButtonLabel', {
          defaultMessage: 'Edit dashboard link',
        })}
      </EuiButtonEmpty>

      {isModalVisible && (
        <SaveDashboardModal
          onClose={() => setIsModalVisible(!isModalVisible)}
          onRefresh={onRefresh}
          currentDashboard={currentDashboard}
          serviceName={serviceName}
        />
      )}
    </>
  );
}
