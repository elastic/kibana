/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SelectDashboard } from './select_dashboard_modal';

export function EditDashboard({
  isModalVisible,
  setIsModalVisible,
  onRefresh,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <EuiButtonEmpty
        color="text"
        size="s"
        iconType={'pencil'}
        data-test-subj="apmEditServiceDashboardMenu"
        onClick={() => setIsModalVisible(true)}
      >
        {i18n.translate('xpack.apm.serviceDashboards.editEmptyButtonLabel', {
          defaultMessage: 'Edit dashboard',
        })}
      </EuiButtonEmpty>

      {isModalVisible && (
        <SelectDashboard
          onClose={() => setIsModalVisible(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
