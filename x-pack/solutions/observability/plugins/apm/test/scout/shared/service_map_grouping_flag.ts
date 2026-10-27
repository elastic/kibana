/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout-oblt';

// Mirrors `APM_SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY` in `apm/common/apm_feature_flags.ts`.
// The Scout projects don't reference the APM plugin, so the key is duplicated here.
// To be removed in https://github.com/elastic/kibana/issues/300607
const SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY = 'apm.serviceMapGroupingEnabled';

type CoreApiServices = Pick<ApiServicesFixture, 'core'>;

/**
 * Turns the service map grouping feature flag on for the whole Kibana server.
 * Be mindful of using it in parallel suites where it might affect other tests, and always pair it with
 * `removeServiceMapGroupingOverride` in teardown to avoid polluting the environment for other suites when running in lanes.
 */
export const enableServiceMapGrouping = async ({ core }: CoreApiServices): Promise<void> => {
  await core.settings({
    'feature_flags.overrides': { [SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY]: true },
  });
};

/**
 * Removes the override added by `enableServiceMapGrouping`, so the flag goes back
 * to its default (off).
 */
export const removeServiceMapGroupingOverride = async ({
  core,
}: CoreApiServices): Promise<void> => {
  await core.settings({
    'feature_flags.overrides': { [SERVICE_MAP_GROUPING_ENABLED_FEATURE_FLAG_KEY]: null },
  });
};
