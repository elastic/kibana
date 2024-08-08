/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../hooks/use_tracked_promise';
import type {
  InfraCustomDashboard,
  InfraSavedCustomDashboard,
  InfraCustomDashboardAssetType,
} from '../../../../common/custom_dashboards';
import {
  InfraCustomDashboardRT,
  InfraDeleteCustomDashboardsResponseBodyRT,
} from '../../../../common/http_api/custom_dashboards_api';

type ActionType = 'create' | 'update' | 'delete';
const errorMessages: Record<ActionType, string> = {
  create: i18n.translate('xpack.infra.linkDashboards.addFailure.toast.title', {
    defaultMessage: 'Error while linking dashboards',
  }),
  update: i18n.translate('xpack.infra.updatingLinkedDashboards.addFailure.toast.title', {
    defaultMessage: 'Error while updating linked dashboards',
  }),
  delete: i18n.translate('xpack.infra.deletingLinkedDashboards.addFailure.toast.title', {
    defaultMessage: 'Error while deleting linked dashboards',
  }),
};
export const useUpdateCustomDashboard = () => {
  const { services } = useKibanaContextForPlugin();
  const { notifications } = useKibana();

  const onError = useCallback(
    (errorMessage: string) => {
      if (errorMessage) {
        notifications.toasts.danger({
          title: errorMessages.update,
          body: errorMessage,
        });
      }
    },
    [notifications.toasts]
  );

  const [updateCustomDashboardRequest, updateCustomDashboard] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async ({
        assetType,
        id,
        dashboardSavedObjectId,
        dashboardFilterAssetIdEnabled,
      }: InfraSavedCustomDashboard) => {
        const rawResponse = await services.http.fetch(
          `/api/infra/${assetType}/custom-dashboards/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              assetType,
              dashboardSavedObjectId,
              dashboardFilterAssetIdEnabled,
            }),
          }
        );

        return decodeOrThrow(InfraCustomDashboardRT)(rawResponse);
      },
      onResolve: (response) => response,
      onReject: (e: Error | unknown) => onError((e as Error)?.message),
    },
    []
  );

  const isUpdateLoading = updateCustomDashboardRequest.state === 'pending';

  const hasUpdateError = updateCustomDashboardRequest.state === 'rejected';

  return {
    updateCustomDashboard,
    isUpdateLoading,
    hasUpdateError,
  };
};

export const useDeleteCustomDashboard = () => {
  const { services } = useKibanaContextForPlugin();
  const { notifications } = useKibana();

  const onError = useCallback(
    (errorMessage: string) => {
      if (errorMessage) {
        notifications.toasts.danger({
          title: errorMessages.delete,
          body: errorMessage,
        });
      }
    },
    [notifications.toasts]
  );

  const [deleteCustomDashboardRequest, deleteCustomDashboard] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async ({
        assetType,
        id,
      }: {
        assetType: InfraCustomDashboardAssetType;
        id: string;
      }) => {
        const rawResponse = await services.http.fetch(
          `/api/infra/${assetType}/custom-dashboards/${id}`,
          {
            method: 'DELETE',
          }
        );

        return decodeOrThrow(InfraDeleteCustomDashboardsResponseBodyRT)(rawResponse);
      },
      onResolve: (response) => response,
      onReject: (e: Error | unknown) => onError((e as Error)?.message),
    },
    []
  );

  const isDeleteLoading = deleteCustomDashboardRequest.state === 'pending';

  const hasDeleteError = deleteCustomDashboardRequest.state === 'rejected';

  return {
    deleteCustomDashboard,
    isDeleteLoading,
    hasDeleteError,
  };
};

export const useCreateCustomDashboard = () => {
  const { services } = useKibanaContextForPlugin();
  const { notifications } = useKibana();

  const onError = useCallback(
    (errorMessage: string) => {
      if (errorMessage) {
        notifications.toasts.danger({
          title: errorMessages.delete,
          body: errorMessage,
        });
      }
    },
    [notifications.toasts]
  );

  const [createCustomDashboardRequest, createCustomDashboard] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async ({
        assetType,
        dashboardSavedObjectId,
        dashboardFilterAssetIdEnabled,
      }: InfraCustomDashboard) => {
        const rawResponse = await services.http.fetch(`/api/infra/${assetType}/custom-dashboards`, {
          method: 'POST',
          body: JSON.stringify({
            dashboardSavedObjectId,
            dashboardFilterAssetIdEnabled,
          }),
        });

        return decodeOrThrow(InfraCustomDashboardRT)(rawResponse);
      },
      onResolve: (response) => response,
      onReject: (e: Error | unknown) => onError((e as Error)?.message),
    },
    []
  );

  const isCreateLoading = createCustomDashboardRequest.state === 'pending';

  const hasCreateError = createCustomDashboardRequest.state === 'rejected';

  return {
    createCustomDashboard,
    isCreateLoading,
    hasCreateError,
  };
};
