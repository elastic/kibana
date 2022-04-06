/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from 'react-query';

import { API_BASE_PATH } from '../../../../common/constants';
import { SlmPolicy, SlmPolicyPayload, PolicyIndicesResponse } from '../../../../common/types';
import { Error } from '../../../shared_imports';
import { useAppContext, useToastNotifications } from '../../app_context';
import {
  UIM_POLICY_EXECUTE,
  UIM_POLICY_DELETE,
  UIM_POLICY_DELETE_MANY,
  UIM_POLICY_CREATE,
  UIM_POLICY_UPDATE,
  UIM_RETENTION_SETTINGS_UPDATE,
  UIM_RETENTION_EXECUTE,
} from '../../constants';
import { UiMetricService } from '../ui_metric';
import { useRequest, sendRequest } from './use_request';

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService;
export const setUiMetricServicePolicy = (_uiMetricService: UiMetricService) => {
  uiMetricService = _uiMetricService;
};
// End hack

interface PoliciesList {
  policies: SlmPolicy[];
}

export const LOAD_POLICIES_KEY = 'LOAD_POLICIES';
export const LOAD_POLICY_KEY = 'LOAD_POLICY';
export const LOAD_POLICY_INDICES = 'LOAD_POLICY_INDICES';

export const useLoadPolicies = () => {
  const {
    services: { httpService },
  } = useAppContext();

  return useQuery<PoliciesList, Error>(
    [LOAD_POLICIES_KEY],
    () => httpService.httpClient.get(`${API_BASE_PATH}policies`),
    {
      // The data from the last successful fetch available while new data is being requested, even though the query key has changed.
      // When the new data arrives, the previous data is seamlessly swapped to show the new data.
      // isPreviousData is made available to know what data the query is currently providing you
      keepPreviousData: true,
    }
  );
};

export const useLoadPolicy = (name: SlmPolicy['name']) => {
  const {
    services: { httpService },
  } = useAppContext();

  return useQuery<{ policy: SlmPolicy }, Error>(
    [LOAD_POLICY_KEY, name],
    () => httpService.httpClient.get(`${API_BASE_PATH}policy/${encodeURIComponent(name)}`),
    {}
  );
};

export const useLoadIndices = () => {
  const {
    services: { httpService },
  } = useAppContext();

  return useQuery<PolicyIndicesResponse, Error>(
    [LOAD_POLICY_INDICES],
    () => httpService.httpClient.get(`${API_BASE_PATH}policies/indices`),
    {}
  );
};

export const executePolicy = async (name: SlmPolicy['name']) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policy/${encodeURIComponent(name)}/run`,
    method: 'post',
  });

  uiMetricService.trackUiMetric(UIM_POLICY_EXECUTE);
  return result;
};

export const deletePolicies = (names: Array<SlmPolicy['name']>) => {
  const queryClient = useQueryClient();
  const {
    services: { httpService, i18n },
  } = useAppContext();
  const toastNotifications = useToastNotifications();

  return useMutation(
    (): Promise<{ itemsDeleted: any[]; errors: Error | Error[] }> =>
      httpService.httpClient.delete(
        `${API_BASE_PATH}policies/${names.map((name) => encodeURIComponent(name)).join(',')}`
      ),
    {
      // When mutate is called:
      onMutate: async (policiesToDelete: Array<SlmPolicy['name']>) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(LOAD_POLICIES_KEY);

        // Snapshot the previous value
        const previousPolicies = queryClient.getQueryData(LOAD_POLICIES_KEY);

        // Optimistically update to the new value
        if (previousPolicies) {
          queryClient.setQueryData<PoliciesList>(LOAD_POLICIES_KEY, (policiesList) => {
            const filteredPolicies = policiesList!.policies.filter((policy) => {
              return !policiesToDelete.includes(policy.name);
            });

            return {
              policies: filteredPolicies,
            };
          });
        }

        return { previousPolicies };
      },
      onSuccess: (data) => {
        toastNotifications.addSuccess(
          i18n.translate('xpack.snapshotRestore.deletePolicy.successMultipleNotificationTitle', {
            defaultMessage:
              'Deleted {count, plural, one {{firstPolicy}} other {{count}}} {count, plural, one {policy} other {policies}}',
            values: {
              firstPolicy: data.itemsDeleted[0],
              count: data.itemsDeleted.length,
            },
          })
        );
      },
      // If the mutation fails, use the context returned from onMutate to rollback
      onError: (err, policiesToDelete, context) => {
        if (context) {
          queryClient.setQueryData<PoliciesList>(
            LOAD_POLICIES_KEY,
            context.previousPolicies as PoliciesList
          );
        }

        toastNotifications.addDanger(
          i18n.translate('xpack.snapshotRestore.deletePolicy.errorNotificationTitle', {
            defaultMessage:
              'Error deleting {count, plural, one {{firstPolicy}} other {{count}}} {count, plural, one {policy} other {policies}}',
            values: {
              firstPolicy: policiesToDelete[0],
              count: policiesToDelete.length,
            },
          })
        );
      },
      // After success or failure
      onSettled: () => {
        // Refetch the todos query
        queryClient.invalidateQueries(LOAD_POLICIES_KEY);
        // track the UI metric
        uiMetricService.trackUiMetric(
          names.length > 1 ? UIM_POLICY_DELETE_MANY : UIM_POLICY_DELETE
        );
      },
    }
  );
};

export const addPolicy = async (newPolicy: SlmPolicyPayload) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies`,
    method: 'post',
    body: newPolicy,
  });

  uiMetricService.trackUiMetric(UIM_POLICY_CREATE);
  return result;
};

export const editPolicy = async (editedPolicy: SlmPolicyPayload) => {
  const result = await sendRequest({
    path: `${API_BASE_PATH}policies/${encodeURIComponent(editedPolicy.name)}`,
    method: 'put',
    body: editedPolicy,
  });

  uiMetricService.trackUiMetric(UIM_POLICY_UPDATE);
  return result;
};

export const useLoadRetentionSettings = () => {
  return useRequest({
    path: `${API_BASE_PATH}policies/retention_settings`,
    method: 'get',
  });
};

export const updateRetentionSchedule = (retentionSchedule: string) => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies/retention_settings`,
    method: 'put',
    body: {
      retentionSchedule,
    },
  });

  uiMetricService.trackUiMetric(UIM_RETENTION_SETTINGS_UPDATE);
  return result;
};

export const executeRetention = async () => {
  const result = sendRequest({
    path: `${API_BASE_PATH}policies/retention`,
    method: 'post',
  });

  uiMetricService.trackUiMetric(UIM_RETENTION_EXECUTE);
  return result;
};
