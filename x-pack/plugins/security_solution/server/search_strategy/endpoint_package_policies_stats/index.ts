/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStrategy, SearchStrategyDependencies } from '@kbn/data-plugin/server';

import { from } from 'rxjs';
import moment from 'moment';
import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { EndpointAuthorizationError } from '../../endpoint/errors';

export const endpointPackagePoliciesStatsSearchStrategyProvider = (
  context: EndpointAppContextService
): ISearchStrategy<{}, IKibanaSearchResponse<{ outdatedManifestsCount: number }>> => {
  return {
    search: (_, __, deps) => {
      return from(requestEndpointPackagePoliciesStatsSearch(context, deps));
    },
  };
};

export const requestEndpointPackagePoliciesStatsSearch = async (
  context: EndpointAppContextService,
  deps: SearchStrategyDependencies
) => {
  const { canReadEndpointList } = await context.getEndpointAuthz(deps.request);

  if (!canReadEndpointList) {
    throw new EndpointAuthorizationError();
  }

  const fleetServices = context.getInternalFleetServices();

  const rawResponse = await fleetServices.packagePolicy.list(deps.savedObjectsClient, {
    perPage: 10000,
    page: 1,
    kuery: `ingest-package-policies.package.name:"endpoint"`,
  });

  const outdatedManifestsCount = rawResponse.items.reduce((acc, item) => {
    const endpointInput = item.inputs.find((input) => input.type === 'endpoint');
    if (!endpointInput) {
      return acc;
    }
    const manifestVersion = endpointInput.config?.policy?.value?.global_manifest_version;
    if (!manifestVersion) {
      return acc;
    }
    if (manifestVersion === 'latest') {
      return acc;
    }
    if (moment.utc(manifestVersion, 'YYYY-MM-DD').isBefore(moment.utc().subtract(1, 'month'))) {
      return acc + 1;
    }

    return acc;
  }, 0);

  return { rawResponse: { outdatedManifestsCount }, isRunning: false, isPartial: false };
};
