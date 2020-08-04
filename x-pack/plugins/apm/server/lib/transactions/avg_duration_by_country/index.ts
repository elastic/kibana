/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { TRANSACTION_PAGE_LOAD } from '../../../../common/transaction_types';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';

export async function getTransactionAvgDurationByCountry({
  setup,
  serviceName,
  transactionName,
  searchAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
}) {
  const { uiFiltersES, apmEventClient, start, end } = setup;
  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...transactionNameFilter,
            { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
            { exists: { field: CLIENT_GEO_COUNTRY_ISO_CODE } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES,
            ...getDocumentTypeFilterForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          ],
        },
      },
      aggs: {
        country_code: {
          terms: {
            field: CLIENT_GEO_COUNTRY_ISO_CODE,
            size: 500,
          },
          aggs: {
            count: {
              value_count: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              },
            },
            avg_duration: {
              avg: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              },
            },
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);

  if (!resp.aggregations) {
    return [];
  }

  const buckets = resp.aggregations.country_code.buckets;
  const avgDurationsByCountry = buckets.map(
    ({ key, count, avg_duration: { value } }) => ({
      key: key as string,
      docCount: count.value,
      value: value === null ? 0 : value,
    })
  );

  return avgDurationsByCountry;
}
