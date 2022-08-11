/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from '@kbn/core/public';
import moment from 'moment';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { SchemaOverview } from './schema_overview';
import { ConfirmSwitchModal } from './confirm_switch_modal';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  callApmApi,
  APIReturnType,
} from '../../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

type FleetMigrationCheckResponse =
  APIReturnType<'GET /internal/apm/fleet/migration_check'>;

const APM_DATA_STREAMS_MIGRATION_STATUS_LS = {
  value: '',
  expiry: '',
};

export function Schema() {
  const [apmDataStreamsMigrationStatus, setApmDataStreamsMigrationStatus] =
    useLocalStorage(
      'apm.dataStreamsMigrationStatus',
      APM_DATA_STREAMS_MIGRATION_STATUS_LS
    );

  const { toasts } = useApmPluginContext().core.notifications;
  const [isSwitchActive, setIsSwitchActive] = useState(false);
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const [unsupportedConfigs, setUnsupportedConfigs] = useState<
    Array<{ key: string; value: any }>
  >([]);

  const {
    refetch,
    data = {} as FleetMigrationCheckResponse,
    status,
  } = useFetcher(
    (callApi) => callApi('GET /internal/apm/fleet/migration_check'),
    [],
    { preservePreviousData: false }
  );
  const isLoading = status !== FETCH_STATUS.SUCCESS;
  const cloudApmMigrationEnabled = !!data.cloud_apm_migration_enabled;
  const hasCloudAgentPolicy = !!data.has_cloud_agent_policy;
  const cloudApmPackagePolicy = data.cloud_apm_package_policy;
  const hasCloudApmPackagePolicy = !!cloudApmPackagePolicy;
  const hasRequiredRole = !!data.has_required_role;
  const latestApmPackageVersion = data.latest_apm_package_version;

  function updateLocalStorage(newStatus: FETCH_STATUS) {
    setApmDataStreamsMigrationStatus({
      value: newStatus,
      expiry: moment().add(5, 'minutes').toISOString(),
    });
  }

  const { value: localStorageValue, expiry } = apmDataStreamsMigrationStatus;
  const isMigrating =
    localStorageValue === FETCH_STATUS.LOADING &&
    moment(expiry).valueOf() > moment.now();

  return (
    <>
      <SchemaOverview
        onSwitch={async () => {
          setIsLoadingConfirmation(true);
          const unsupported = await getUnsupportedApmServerConfigs(toasts);
          if (!unsupported) {
            setIsLoadingConfirmation(false);
            return;
          }
          setUnsupportedConfigs(unsupported);
          setIsLoadingConfirmation(false);
          setIsSwitchActive(true);
        }}
        isMigrating={isMigrating}
        isMigrated={hasCloudApmPackagePolicy}
        isLoading={isLoading}
        isLoadingConfirmation={isLoadingConfirmation}
        cloudApmMigrationEnabled={cloudApmMigrationEnabled}
        hasCloudAgentPolicy={hasCloudAgentPolicy}
        hasRequiredRole={hasRequiredRole}
        cloudApmPackagePolicy={cloudApmPackagePolicy}
        latestApmPackageVersion={latestApmPackageVersion}
      />
      {isSwitchActive && (
        <ConfirmSwitchModal
          onConfirm={async () => {
            setIsSwitchActive(false);
            const apmPackagePolicy = await createCloudApmPackagePolicy(
              toasts,
              updateLocalStorage
            );
            if (!apmPackagePolicy) {
              return;
            }
            refetch();
          }}
          onCancel={() => {
            setIsSwitchActive(false);
          }}
          unsupportedConfigs={unsupportedConfigs}
        />
      )}
    </>
  );
}

async function getUnsupportedApmServerConfigs(
  toasts: NotificationsStart['toasts']
) {
  try {
    const { unsupported } = await callApmApi(
      'GET /internal/apm/fleet/apm_server_schema/unsupported',
      {
        signal: null,
      }
    );
    return unsupported;
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.settings.unsupportedConfigs.errorToast.title',
        {
          defaultMessage: 'Unable to fetch APM Server settings',
        }
      ),
      text: error.body?.message || error.message,
    });
  }
}

async function createCloudApmPackagePolicy(
  toasts: NotificationsStart['toasts'],
  updateLocalStorage: (status: FETCH_STATUS) => void
) {
  updateLocalStorage(FETCH_STATUS.LOADING);
  try {
    const { cloudApmPackagePolicy } = await callApmApi(
      'POST /internal/apm/fleet/cloud_apm_package_policy',
      {
        signal: null,
      }
    );
    updateLocalStorage(FETCH_STATUS.SUCCESS);
    return cloudApmPackagePolicy;
  } catch (error) {
    updateLocalStorage(FETCH_STATUS.FAILURE);
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.settings.createApmPackagePolicy.errorToast.title',
        {
          defaultMessage:
            'Unable to create APM package policy on cloud agent policy',
        }
      ),
      text: error.body?.message || error.message,
    });
  }
}
