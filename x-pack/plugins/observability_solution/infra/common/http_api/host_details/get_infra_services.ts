/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createLiteralValueFromUndefinedRT,
  inRangeFromStringRt,
  isoToEpochRt,
} from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const sizeRT = rt.union([
  inRangeFromStringRt(1, 100),
  createLiteralValueFromUndefinedRT(10),
]);

export const servicesFiltersRT = rt.strict({
  ['host.name']: rt.string,
});

export type ServicesFilter = rt.TypeOf<typeof servicesFiltersRT>;

export const GetServicesRequestQueryRT = rt.intersection([
  rt.strict({ from: isoToEpochRt, to: isoToEpochRt, filters: rt.string }),
  rt.partial({
    size: sizeRT,
    validatedFilters: servicesFiltersRT,
  }),
]);

export type GetServicesRequestQuery = rt.TypeOf<typeof GetServicesRequestQueryRT>;

export interface ServicesAPIRequest {
  filters: ServicesFilter;
  from: number;
  to: number;
  size?: number;
}

const AgentNameRT = rt.union([rt.string, rt.null]);

export const ServicesAPIQueryAggregationRT = rt.type({
  services: rt.type({
    buckets: rt.array(
      rt.type({
        key: rt.string,
        latestAgent: rt.type({
          top: rt.array(
            rt.type({
              sort: rt.array(rt.string),
              metrics: rt.type({
                'agent.name': AgentNameRT,
              }),
            })
          ),
        }),
      })
    ),
  }),
});

export type ServicesAPIQueryAggregation = rt.TypeOf<typeof ServicesAPIQueryAggregationRT>;

export const ServiceRT = rt.type({
  serviceName: rt.string,
  agentName: AgentNameRT,
});

export type Service = rt.TypeOf<typeof ServiceRT>;

export const ServicesAPIResponseRT = rt.type({
  services: rt.array(ServiceRT),
});

export type ServicesAPIResponse = rt.TypeOf<typeof ServicesAPIResponseRT>;
