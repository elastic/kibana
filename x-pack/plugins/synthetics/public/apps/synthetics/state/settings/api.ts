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
  DynamicSettingsSaveType,
  DynamicSettingsType,
} from '../../../../../common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../../../common/constants';

const apiPath = API_URLS.DYNAMIC_SETTINGS;

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(apiPath, undefined, DynamicSettingsType);
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  return await apiService.post(apiPath, settings, DynamicSettingsSaveType);
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
      ...res
    }) => ({
      ...res,
      actionTypeId,
      referencedByCount,
      isDeprecated,
      isPreconfigured,
      isMissingSecrets,
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
      ...res
    }: AsApiContract<ActionType>) => ({
      ...res,
      enabledInConfig,
      enabledInLicense,
      minimumLicenseRequired,
      supportedFeatureIds,
    })
  );
};

export const syncGlobalParamsAPI = async (): Promise<boolean> => {
  return await apiService.get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS);
};
