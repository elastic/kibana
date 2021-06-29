/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { SchemaOverview } from './schema_overview';
import { ConfirmSwitchModal } from './confirm_switch_modal';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  callApmApi,
  APIReturnType,
} from '../../../../services/rest/createCallApmApi';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

type FleetMigrationCheckResponse = APIReturnType<'GET /api/apm/fleet/migration_check'>;

export function Schema() {
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSwitchActive, setIsSwitchActive] = useState(false);
  const [isLoadingMigration, setIsLoadingMigration] = useState(false);
  const [isLoadingConfirmation, setIsLoadingConfirmation] = useState(false);
  const [unsupportedConfigs, setUnsupportedConfigs] = useState<
    Array<{ key: string; value: any }>
  >([]);

  const {
    refetch,
    data = {} as FleetMigrationCheckResponse,
    status,
  } = useFetcher(
    (callApi) => callApi({ endpoint: 'GET /api/apm/fleet/migration_check' }),
    [],
    { preservePreviousData: false }
  );
  const isLoading = status !== FETCH_STATUS.SUCCESS;
  const cloudApmMigrationEnabled = !!data.cloud_apm_migration_enabled;
  const hasCloudAgentPolicy = !!data.has_cloud_agent_policy;
  const hasCloudApmPackagePolicy = !!data.has_cloud_apm_package_policy;
  const hasRequiredRole = !!data.has_required_role;
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
        isMigrated={hasCloudApmPackagePolicy}
        isLoading={isLoading}
        isLoadingConfirmation={isLoadingConfirmation}
        cloudApmMigrationEnabled={cloudApmMigrationEnabled}
        hasCloudAgentPolicy={hasCloudAgentPolicy}
        hasRequiredRole={hasRequiredRole}
      />
      {isSwitchActive && (
        <ConfirmSwitchModal
          isLoading={isLoadingMigration}
          onConfirm={async () => {
            setIsLoadingMigration(true);
            const apmPackagePolicy = await createCloudApmPackagePolicy(toasts);
            if (!apmPackagePolicy) {
              setIsLoadingMigration(false);
              return;
            }
            setIsSwitchActive(false);
            refetch();
          }}
          onCancel={() => {
            if (isLoadingMigration) {
              return;
            }
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
    const { unsupported } = await callApmApi({
      endpoint: 'GET /api/apm/fleet/apm_server_schema/unsupported',
      signal: null,
    });
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
  toasts: NotificationsStart['toasts']
) {
  try {
    const {
      cloud_apm_package_policy: cloudApmPackagePolicy,
    } = await callApmApi({
      endpoint: 'POST /api/apm/fleet/cloud_apm_package_policy',
      signal: null,
    });
    return cloudApmPackagePolicy;
  } catch (error) {
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
