/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../../common/custom_dashboards';
import { useDeleteCustomDashboard } from '../../../hooks/use_custom_dashboards';
import { useFetchCustomDashboards } from '../../../hooks/use_fetch_custom_dashboards';
import { useAssetDetailsUrlState } from '../../../hooks/use_asset_details_url_state';

export function UnlinkDashboard({
  currentDashboard,
  onRefresh,
  assetType,
}: {
  currentDashboard: DashboardItemWithTitle;
  onRefresh: () => void;
  assetType: InfraCustomDashboardAssetType;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { notifications } = useKibana();

  const [, setUrlState] = useAssetDetailsUrlState();
  const { deleteCustomDashboard, isDeleteLoading } = useDeleteCustomDashboard();
  const { dashboards, loading } = useFetchCustomDashboards({ assetType });

  const onClick = useCallback(() => setIsModalVisible(true), []);
  const onCancel = useCallback(() => setIsModalVisible(false), []);
  const onError = useCallback(() => setIsModalVisible(!isModalVisible), [isModalVisible]);

  const onConfirm = useCallback(
    async function () {
      try {
        const linkedDashboards = (dashboards ?? []).filter(
          ({ dashboardSavedObjectId }) =>
            dashboardSavedObjectId !== currentDashboard.dashboardSavedObjectId
        );
        const result = await deleteCustomDashboard({
          assetType,
          id: currentDashboard.id,
        });
        setUrlState({ dashboardId: linkedDashboards[0]?.dashboardSavedObjectId });

        if (result) {
          notifications.toasts.success({
            title: i18n.translate('xpack.infra.customDashboards.unlinkSuccess.toast.title', {
              defaultMessage: 'Unlinked "{dashboardName}" dashboard',
              values: { dashboardName: currentDashboard?.title },
            }),
          });
          onRefresh();
        }
      } catch (error) {
        notifications.toasts.danger({
          title: i18n.translate('xpack.infra.customDashboards.unlinkFailure.toast.title', {
            defaultMessage: 'Error while unlinking "{dashboardName}" dashboard',
            values: { dashboardName: currentDashboard?.title },
          }),
          body: error.body.message,
        });
      }
      onError();
    },
    [
      onError,
      dashboards,
      deleteCustomDashboard,
      assetType,
      currentDashboard.id,
      currentDashboard.dashboardSavedObjectId,
      currentDashboard?.title,
      setUrlState,
      notifications.toasts,
      onRefresh,
    ]
  );

  return (
    <>
      <EuiButtonEmpty
        color="danger"
        size="s"
        iconType="unlink"
        data-test-subj="infraUnLinkCustomDashboardMenu"
        onClick={onClick}
      >
        {i18n.translate('xpack.infra.customDashboards.unlinkEmptyButtonLabel', {
          defaultMessage: 'Unlink dashboard',
        })}
      </EuiButtonEmpty>
      {isModalVisible && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.infra.customDashboards.unlinkEmptyButtonLabel.confirm.title',
            {
              defaultMessage: 'Unlink Dashboard',
            }
          )}
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmButtonText={i18n.translate(
            'xpack.infra.customDashboards.unlinkEmptyButtonLabel.confirm.button',
            {
              defaultMessage: 'Unlink dashboard',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          isLoading={loading || isDeleteLoading}
        >
          <p>
            {i18n.translate('xpack.infra.customDashboards.unlinkEmptyButtonLabel.confirm.body', {
              defaultMessage: `You are about to unlink the dashboard from the {assetType} context`,
              values: { assetType },
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
