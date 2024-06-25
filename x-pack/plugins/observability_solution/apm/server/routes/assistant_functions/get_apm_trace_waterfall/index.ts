/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import * as t from 'io-ts';
import type { Logger } from '@kbn/logging';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import {
  buildTraceTree,
  getWaterfall,
  treeToASCII,
} from '../../../../common/waterfall/waterfall_helpers';
import type { APMConfig } from '../../..';
import { TraceSearchType } from '../../../../common/trace_explorer';
import { Environment, environmentStringRt } from '../../../../common/environment_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTraceSamplesByQuery } from '../../traces/get_trace_samples_by_query';
import { getTraceItems, type TraceItems } from '../../traces/get_trace_items';
import { getTransaction } from '../../transactions/get_transaction';

export const getApmTracesRt = t.intersection([
  t.type({
    start: t.string,
    end: t.string,
  }),
  t.partial({
    filter: t.string,
    'service.environment': environmentStringRt,
  }),
]);

export interface ApmTraceWaterfall {
  start: number;
  end: number;
  environment: Environment;
  ascii: string;
  data?: { traceItems: TraceItems; entryTransaction?: Transaction };
}

export async function getApmTraceWaterfall({
  arguments: args,
  apmEventClient,
  config,
  logger,
}: {
  arguments: t.TypeOf<typeof getApmTracesRt>;
  apmEventClient: APMEventClient;
  config: APMConfig;
  logger: Logger;
}): Promise<ApmTraceWaterfall> {
  const start = datemath.parse(args.start)!.valueOf();
  const end = datemath.parse(args.end)!.valueOf();
  const environment = args['service.environment'] ?? ENVIRONMENT_ALL.value;

  const traceSamples = await getTraceSamplesByQuery({
    apmEventClient,
    start,
    end,
    environment,
    query: args.filter ?? '',
    type: TraceSearchType.kql,
  });

  if (traceSamples.length === 0) {
    return {
      start,
      end,
      environment,
      ascii: '',
      data: undefined,
    };
  }

  const [traceItems, entryTransaction] = await Promise.all([
    getTraceItems({
      traceId: traceSamples[0].traceId,
      config,
      apmEventClient,
      start,
      end,
      logger,
    }),
    getTransaction({
      transactionId: traceSamples[0].transactionId,
      traceId: traceSamples[0].traceId,
      apmEventClient,
      start,
      end,
    }),
  ]);

  const waterfall = getWaterfall({ traceItems, entryTransaction });
  const maxLevelOpen = waterfall.traceDocsTotal > 500 ? 2 : waterfall.traceDocsTotal;

  // const criticalPath = getCriticalPath(waterfall);
  // const criticalPathSegmentsById = groupBy(criticalPath.segments, (segment) => segment.item.id);

  const tree = buildTraceTree({
    waterfall,
    maxLevelOpen,
    isOpen: true,
    path: {
      criticalPathSegmentsById: {},
      showCriticalPath: false,
    },
  });

  return {
    start,
    end,
    environment,
    ascii: tree ? treeToASCII(tree) : '',
    data: { traceItems, entryTransaction },
  };
}
