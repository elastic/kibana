/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetupDeps } from '../..';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { CoreStartWithUsageCollector } from '../lib/apm_telemetry/make_apm_usage_collector';
import { initErrorsApi } from '../routes/errors';
import { initMetricsApi } from '../routes/metrics';
import { initServicesApi } from '../routes/services';
import { initTracesApi } from '../routes/traces';
import { initTransactionGroupsApi } from '../routes/transaction_groups';

export class Plugin {
  public setup(core: SetupDeps) {
    initTransactionGroupsApi(core);
    initTracesApi(core);
    initServicesApi(core);
    initErrorsApi(core);
    initMetricsApi(core);
    makeApmUsageCollector(core as CoreStartWithUsageCollector);
  }
}
