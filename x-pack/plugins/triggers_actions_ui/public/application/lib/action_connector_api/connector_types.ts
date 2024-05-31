/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';

import {
  AsApiContract,
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
} from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type { ActionType } from '../../../types';

const rewriteResponseRes = (results: Array<AsApiContract<ActionType>>): ActionType[] => {
  return results.map((item) => rewriteBodyReq(item));
};

const rewriteBodyReq: RewriteRequestCase<ActionType> = ({
  enabled_in_config: enabledInConfig,
  enabled_in_license: enabledInLicense,
  minimum_license_required: minimumLicenseRequired,
  supported_feature_ids: supportedFeatureIds,
  is_system_action_type: isSystemActionType,
  ...res
}: AsApiContract<ActionType>) => ({
  enabledInConfig,
  enabledInLicense,
  minimumLicenseRequired,
  supportedFeatureIds,
  isSystemActionType,
  ...res,
});

export async function loadActionTypes({
  http,
  featureId,
  includeSystemActions = false,
}: {
  http: HttpSetup;
  featureId?: string;
  includeSystemActions?: boolean;
}): Promise<ActionType[]> {
  const path = includeSystemActions
    ? `${INTERNAL_BASE_ACTION_API_PATH}/connector_types`
    : `${BASE_ACTION_API_PATH}/connector_types`;

  const res = featureId
    ? await http.get<Parameters<typeof rewriteResponseRes>[0]>(path, {
        query: {
          feature_id: featureId,
        },
      })
    : await http.get<Parameters<typeof rewriteResponseRes>[0]>(path, {});
  return rewriteResponseRes(res);
}
