/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type {
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../../common/custom_dashboards';
import { SaveDashboardModal } from './save_dashboard_modal';

export function LinkDashboard({
  onRefresh,
  newDashboardButton = false,
  customDashboards,
  assetType,
}: {
  onRefresh: () => void;
  newDashboardButton?: boolean;
  customDashboards?: DashboardItemWithTitle[];
  assetType: InfraCustomDashboardAssetType;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      {newDashboardButton ? (
        <EuiButtonEmpty
          color="text"
          size="s"
          iconType="plusInCircle"
          data-test-subj="infraLinkDashboardMenu"
          onClick={() => setIsModalVisible(true)}
        >
          {i18n.translate('xpack.infra.assetDetails.dashboards.linkNewDashboardButtonLabel', {
            defaultMessage: 'Link new dashboard',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButton data-test-subj="infraAddDashboard" onClick={() => setIsModalVisible(true)}>
          {i18n.translate('xpack.infra.assetDetails.dashboards.linkButtonLabel', {
            defaultMessage: 'Link dashboard',
          })}
        </EuiButton>
      )}
      {isModalVisible && (
        <SaveDashboardModal
          onClose={() => setIsModalVisible(false)}
          onRefresh={onRefresh}
          customDashboards={customDashboards}
          assetType={assetType}
        />
      )}
    </>
  );
}
