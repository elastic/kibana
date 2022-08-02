/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { VisTypeTimeseriesSetup } from '@kbn/vis-type-timeseries-plugin/server';

import { getCapabilitiesForRollupIndices } from '@kbn/data-plugin/server';
import { IndexManagementPluginSetup } from '@kbn/index-management-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { License } from './services';
import { IndexPatternsFetcher } from './shared_imports';
import { handleEsError } from './shared_imports';
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
    handleEsError: typeof handleEsError;
    formatEsError: typeof formatEsError;
    getCapabilitiesForRollupIndices: typeof getCapabilitiesForRollupIndices;
  };
  sharedImports: {
    IndexPatternsFetcher: typeof IndexPatternsFetcher;
  };
}
