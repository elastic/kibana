/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchUiMetrics } from '../../../../server/lib/ui_metric';
import { UA_APP_NAME, USER_ACTIONS } from '../../common/constants';

const INDEX_LIFECYCLE_MANAGEMENT_USAGE_TYPE = 'index_lifecycle_management';

export function registerIndexLifecycleManagementUsageCollector(server) {
  const collector = server.usage.collectorSet.makeUsageCollector({
    type: INDEX_LIFECYCLE_MANAGEMENT_USAGE_TYPE,
    fetch: async () => {
      const uiMetrics = await fetchUiMetrics(server, UA_APP_NAME, USER_ACTIONS);

      return {
        ui_metrics: uiMetrics,
      };
    },
  });

  server.usage.collectorSet.register(collector);
}
