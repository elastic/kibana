/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { termQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { getAgentVersion } from '../../lib/get_agent_version';

export interface CreateKubernetesOnboardingFlowRouteResponse {
  apiKeyEncoded: string;
  onboardingId: string;
  elasticsearchUrl: string;
  elasticAgentVersion: string;
}

export interface HasKubernetesDataRouteResponse {
  hasData: boolean;
}

const createKubernetesOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/kubernetes/flow',
  options: { tags: [] },
  async handler({
    context,
    request,
    plugins,
    services,
    kibanaVersion,
  }): Promise<CreateKubernetesOnboardingFlowRouteResponse> {
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asScoped(request);

    await packageClient.ensureInstalledPackage({ pkgName: 'kubernetes' });

    const [{ encoded: apiKeyEncoded }, elasticAgentVersion] = await Promise.all([
      createShipperApiKey(client.asCurrentUser, 'kubernetes_onboarding'),
      getAgentVersion(fleetPluginStart, kibanaVersion),
    ]);
    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      elasticAgentVersion,
    };
  },
});

const hasKubernetesDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/kubernetes/{onboardingId}/has-data',
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
  }),
  options: { tags: [] },
  async handler(resources): Promise<HasKubernetesDataRouteResponse> {
    const { onboardingId } = resources.params.path;
    const { elasticsearch } = await resources.context.core;

    try {
      const result = await elasticsearch.client.asCurrentUser.search({
        index: ['logs-*', 'metrics-*'],
        ignore_unavailable: true,
        size: 0,
        terminate_after: 1,
        query: {
          bool: {
            filter: termQuery('fields.onboarding_id', onboardingId),
          },
        },
      });
      const { value } = result.hits.total as estypes.SearchTotalHits;

      return {
        hasData: value > 0,
      };
    } catch (error) {
      throw Boom.internal(`Elasticsearch responses with an error. ${error.message}`);
    }
  },
});

export const kubernetesOnboardingRouteRepository = {
  ...createKubernetesOnboardingFlowRoute,
  ...hasKubernetesDataRoute,
};
