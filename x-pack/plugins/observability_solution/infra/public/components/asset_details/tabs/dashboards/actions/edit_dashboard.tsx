/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import type {
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../../common/custom_dashboards';
import { SaveDashboardModal } from './save_dashboard_modal';

export function EditDashboard({
  onRefresh,
  currentDashboard,
  assetType,
}: {
  onRefresh: () => void;
  currentDashboard: DashboardItemWithTitle;
  assetType: InfraCustomDashboardAssetType;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const onClick = useCallback(() => setIsModalVisible(!isModalVisible), [isModalVisible]);

  return (
    <>
      <EuiButtonEmpty
        color="text"
        size="s"
        iconType="pencil"
        data-test-subj="infraEditCustomDashboardMenu"
        onClick={onClick}
      >
        {i18n.translate('xpack.infra.customDashboards.editEmptyButtonLabel', {
          defaultMessage: 'Edit dashboard link',
        })}
      </EuiButtonEmpty>

      {isModalVisible && (
        <SaveDashboardModal
          onClose={onClick}
          onRefresh={onRefresh}
          currentDashboard={currentDashboard}
          assetType={assetType}
        />
      )}
    </>
  );
}
