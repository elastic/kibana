/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { ensureIndexPatternExists } from '../lib/index_pattern';
import { CoreSetupWithUsageCollector } from '../lib/apm_telemetry/make_apm_usage_collector';
import { initErrorsApi } from '../routes/errors';
import { initMetricsApi } from '../routes/metrics';
import { initServicesApi } from '../routes/services';
import { initTracesApi } from '../routes/traces';
import { initTransactionGroupsApi } from '../routes/transaction_groups';
import { initUIFiltersApi } from '../routes/ui_filters';
import { initSettingsApi } from '../routes/settings';

export class Plugin {
  public setup(core: InternalCoreSetup) {
    initErrorsApi(core);
    initMetricsApi(core);
    initServicesApi(core);
    initSettingsApi(core);
    initTracesApi(core);
    initTransactionGroupsApi(core);
    initUIFiltersApi(core);
    makeApmUsageCollector(core as CoreSetupWithUsageCollector);
    ensureIndexPatternExists(core);
  }
}
