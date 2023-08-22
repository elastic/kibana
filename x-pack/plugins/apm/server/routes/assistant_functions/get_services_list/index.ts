/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import datemath from '@elastic/datemath';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';

export const getApmServicesListRouteRt = t.type({
  start: t.string,
  end: t.string,
});

export interface ApmServicesListContent {
  hasMore: boolean;
  services: Array<{ [SERVICE_NAME]: string }>;
}

export async function getApmServicesList({
  arguments: args,
  apmEventClient,
}: {
  arguments: t.TypeOf<typeof getApmServicesListRouteRt>;
  apmEventClient: APMEventClient;
}): Promise<ApmServicesListContent> {
  const start = datemath.parse(args.start)!.valueOf();
  const end = datemath.parse(args.end)!.valueOf();

  const terms = await apmEventClient.termsEnum('get_services_list', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    index_filter: {
      bool: {
        filter: rangeQuery(start, end),
      },
    },
    size: 20,
    field: SERVICE_NAME,
  });

  return {
    services: terms.terms.map((term) => ({ [SERVICE_NAME]: term })),
    hasMore: !terms.complete,
  };
}
