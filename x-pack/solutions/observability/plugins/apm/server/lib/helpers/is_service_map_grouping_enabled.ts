/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY } from '../../../common/apm_feature_flags';
import type { APMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export const isServiceMapGroupingEnabled = async ({
  context,
}: Pick<APMRouteHandlerResources, 'context'>): Promise<boolean> => {
  const { featureFlags } = await context.core;
  return featureFlags.getBooleanValue(APM_SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY, false);
};
