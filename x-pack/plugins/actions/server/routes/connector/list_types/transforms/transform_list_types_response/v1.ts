/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorType } from '../../../../../application/connector/types';
import { ConnectorTypesResponseV1 } from '../../../schemas/response';

export const transformListTypesResponse = (
  results: ConnectorType[]
): ConnectorTypesResponseV1[] => {
  return results.map(
    ({
      id,
      name,
      enabled,
      enabledInConfig,
      enabledInLicense,
      minimumLicenseRequired,
      supportedFeatureIds,
      isSystemActionType,
    }) => ({
      id,
      name,
      enabled,
      enabled_in_config: enabledInConfig,
      enabled_in_license: enabledInLicense,
      minimum_license_required: minimumLicenseRequired,
      supported_feature_ids: supportedFeatureIds,
      is_system_action_type: isSystemActionType,
    })
  );
};
