/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import moment from 'moment';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { joinByKey } from '../../../common/utils/join_by_key';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup } from '../../lib/helpers/setup_request';
import { getAverages, getCounts, getSums } from './get_transaction_group_stats';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

type Key = Record<'service.name' | 'transaction.name', string>;
export interface TransactionGroup {
  key: Key;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  averageResponseTime: number | null | undefined;
  transactionsPerMinute: number;
  impact: number;
  agentName: AgentName;
}

export type TransactionGroupSetup = Setup;

function getItemsWithRelativeImpact(
  setup: TransactionGroupSetup,
  items: Array<{
    sum?: number | null;
    key: Key;
    avg?: number | null;
    count?: number | null;
    transactionType?: string;
    agentName?: AgentName;
  }>,
  start: number,
  end: number
) {
  const values = items
    .map(({ sum }) => sum)
    .filter((value) => value !== null) as number[];

  const max = Math.max(...values);
  const min = Math.min(...values);

  const duration = moment.duration(end - start);
  const minutes = duration.asMinutes();

  const itemsWithRelativeImpact = items.map((item) => {
    return {
      key: item.key,
      averageResponseTime: item.avg,
      transactionsPerMinute: (item.count ?? 0) / minutes,
      transactionType: item.transactionType || '',
      impact:
        item.sum !== null && item.sum !== undefined
          ? ((item.sum - min) / (max - min)) * 100 || 0
          : 0,
      agentName: item.agentName as AgentName,
    };
  });

  return itemsWithRelativeImpact;
}

export function getTopTraces({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  return withApmSpan('get_top_traces', async () => {
    const params = {
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      start,
      end,
    };

    const [counts, averages, sums] = await Promise.all([
      getCounts(params),
      getAverages(params),
      getSums(params),
    ]);

    const stats = [...averages, ...counts, ...sums];

    const items = joinByKey(stats, 'key');

    const itemsWithRelativeImpact = getItemsWithRelativeImpact(
      setup,
      items,
      start,
      end
    );

    const itemsWithKeys = itemsWithRelativeImpact.map((item) => ({
      ...item,
      transactionName: item.key[TRANSACTION_NAME],
      serviceName: item.key[SERVICE_NAME],
    }));

    return {
      // sort by impact by default so most impactful services are not cut off
      items: sortBy(itemsWithKeys, 'impact').reverse(),
    };
  });
}
