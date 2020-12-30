/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { VisTypeTimeseriesSetup } from 'src/plugins/vis_type_timeseries/server';

import { getCapabilitiesForRollupIndices } from 'src/plugins/data/server';
import { IndexManagementPluginSetup } from '../../index_management/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { License } from './services';
import { IndexPatternsFetcher } from './shared_imports';
import { isEsError } from './shared_imports';
import { formatEsError } from './lib/format_es_error';

export interface Dependencies {
  indexManagement?: IndexManagementPluginSetup;
  visTypeTimeseries?: VisTypeTimeseriesSetup;
  usageCollection?: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  lib: {
    isEsError: typeof isEsError;
    formatEsError: typeof formatEsError;
    getCapabilitiesForRollupIndices: typeof getCapabilitiesForRollupIndices;
  };
  sharedImports: {
    IndexPatternsFetcher: typeof IndexPatternsFetcher;
  };
}
