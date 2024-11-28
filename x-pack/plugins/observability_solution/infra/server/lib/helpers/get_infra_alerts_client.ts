/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { KibanaRequest } from '@kbn/core/server';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { InfraBackendLibs } from '../infra_types';

type RequiredParams = ESSearchRequest & {
  size: number;
  track_total_hits: boolean | number;
};

export type InfraAlertsClient = Awaited<ReturnType<typeof getInfraAlertsClient>>;

export async function getInfraAlertsClient({
  libs,
  request,
}: {
  libs: InfraBackendLibs;
  request: KibanaRequest;
}) {
  const [, { ruleRegistry }] = await libs.getStartServices();
  const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
  const infraAlertsIndices = await alertsClient.getAuthorizedAlertsIndices([
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.OBSERVABILITY,
    AlertConsumers.LOGS,
    AlertConsumers.SLO,
    AlertConsumers.APM,
  ]);

  if (!infraAlertsIndices || isEmpty(infraAlertsIndices)) {
    throw Error('No alert indices exist for "infrastructure"');
  }

  return {
    search<TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<ParsedTechnicalFields, TParams>> {
      return alertsClient.find({
        ...searchParams,
        index: infraAlertsIndices.join(','),
      }) as Promise<any>;
    },
  };
}
