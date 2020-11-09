/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadIndexPatterns, loadSavedSearches } from '../util/index_utils';
import { checkFullLicense } from '../license';
import { checkGetJobsCapabilitiesResolver } from '../capabilities/check_capabilities';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../services/ml_server_info';

import { IndexPatternsContract } from '../../../../../../src/plugins/data/public';

export interface Resolvers {
  [name: string]: () => Promise<any>;
}
export interface ResolverResults {
  [name: string]: any;
}

interface BasicResolverDependencies {
  indexPatterns: IndexPatternsContract;
  redirectToMlAccessDeniedPage: () => Promise<void>;
}

export const basicResolvers = ({
  indexPatterns,
  redirectToMlAccessDeniedPage,
}: BasicResolverDependencies): Resolvers => ({
  checkFullLicense,
  getMlNodeCount,
  loadMlServerInfo,
  loadIndexPatterns: () => loadIndexPatterns(indexPatterns),
  checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
  loadSavedSearches,
});
