/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionConnector as RawActionConnector,
  ActionType,
  AsApiContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { apiService } from '../../../../utils/api_service';
import {
  DynamicSettings,
  DynamicSettingsSaveResponse,
  DynamicSettingsSaveCodec,
  DynamicSettingsCodec,
  LocationMonitorsResponse,
  LocationMonitorsType,
} from '../../../../../common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { LocationMonitor } from '.';

const apiPath = API_URLS.DYNAMIC_SETTINGS;

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(apiPath, undefined, DynamicSettingsCodec);
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  return await apiService.post(apiPath, settings, DynamicSettingsSaveCodec);
};

export const fetchLocationMonitors = async (): Promise<LocationMonitor[]> => {
  const { payload } = await apiService.get<LocationMonitorsResponse>(
    SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,
    undefined,
    LocationMonitorsType
  );

  return payload;
};

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const fetchConnectors = async (): Promise<ActionConnector[]> => {
  const response = (await apiService.get(API_URLS.RULE_CONNECTORS)) as Array<
    AsApiContract<ActionConnector>
  >;
  return response.map(
    ({
      connector_type_id: actionTypeId,
      referenced_by_count: referencedByCount,
      is_preconfigured: isPreconfigured,
      is_deprecated: isDeprecated,
      is_missing_secrets: isMissingSecrets,
      is_system_action: isSystemAction,
      ...res
    }) => ({
      ...res,
      actionTypeId,
      referencedByCount,
      isDeprecated,
      isPreconfigured,
      isMissingSecrets,
      isSystemAction,
    })
  );
};

export const fetchActionTypes = async (): Promise<ActionType[]> => {
  const response = (await apiService.get(API_URLS.CONNECTOR_TYPES, {
    feature_id: 'uptime',
  })) as Array<AsApiContract<ActionType>>;
  return response.map<ActionType>(
    ({
      enabled_in_config: enabledInConfig,
      enabled_in_license: enabledInLicense,
      minimum_license_required: minimumLicenseRequired,
      supported_feature_ids: supportedFeatureIds,
      is_system_action_type: isSystemActionType,
      ...res
    }: AsApiContract<ActionType>) => ({
      ...res,
      enabledInConfig,
      enabledInLicense,
      minimumLicenseRequired,
      supportedFeatureIds,
      isSystemActionType,
    })
  );
};

export const syncGlobalParamsAPI = async (): Promise<boolean> => {
  return await apiService.get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS);
};
