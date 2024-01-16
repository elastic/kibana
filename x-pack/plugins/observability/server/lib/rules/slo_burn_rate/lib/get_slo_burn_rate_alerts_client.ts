/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ObservabilityRouteHandlerResources } from '../../../../types';

export type SLOAlertsClient = Awaited<ReturnType<typeof getSLOAlertsClient>>;

export async function getSLOAlertsClient({
  dependencies,
  request,
}: {
  dependencies: ObservabilityRouteHandlerResources['dependencies'];
  request: ObservabilityRouteHandlerResources['request'];
}) {
  const alertsClient = await dependencies.getRacClientWithRequest(request);
  const sloAlertsIndices = await alertsClient.getAuthorizedAlertsIndices(['slo']);

  if (!sloAlertsIndices || isEmpty(sloAlertsIndices)) {
    throw Error('No alert indices exist for "apm"');
  }

  type RequiredParams = ESSearchRequest & {
    size: number;
    track_total_hits: boolean | number;
  };

  return {
    search<TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<ParsedTechnicalFields, TParams>> {
      return alertsClient.find({
        ...searchParams,
        index: sloAlertsIndices.join(','),
      }) as Promise<any>;
    },
  };
}
