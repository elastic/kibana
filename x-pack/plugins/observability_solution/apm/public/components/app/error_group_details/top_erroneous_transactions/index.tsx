/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTitle,
  RIGHT_ALIGNMENT,
  EuiSpacer,
} from '@elastic/eui';
import { ValuesType } from 'utility-types';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { TransactionDetailLink } from '../../../shared/links/apm/transaction_detail_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { useFetcher, FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { asInteger } from '../../../../../common/utils/formatters';

type ErroneousTransactions =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions'>;

interface Props {
  serviceName: string;
}

const INITIAL_STATE: ErroneousTransactions = {
  topErroneousTransactions: [],
};

export function TopErroneousTransactions({ serviceName }: Props) {
  const {
    query,
    path: { groupId },
  } = useApmParams('/services/{serviceName}/errors/{groupId}');

  const { rangeFrom, rangeTo, environment, kuery, offset, comparisonEnabled } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions',
          {
            params: {
              path: {
                serviceName,
                groupId,
              },
              query: {
                environment,
                kuery,
                start,
                end,
                numBuckets: 20,
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              },
            },
          }
        );
      }
    },
    [environment, kuery, serviceName, start, end, groupId, comparisonEnabled, offset]
  );

  const loading = isPending(status);

  const columns: Array<
    EuiBasicTableColumn<ValuesType<ErroneousTransactions['topErroneousTransactions']>>
  > = [
    {
      field: 'transactionName',
      width: '60%',
      name: i18n.translate('xpack.apm.errorGroupTopTransactions.column.transactionName', {
        defaultMessage: 'Transaction name',
      }),
      render: (_, { transactionName, transactionType }) => {
        return (
          <TruncateWithTooltip
            text={transactionName}
            content={
              <TransactionDetailLink
                serviceName={serviceName}
                transactionName={transactionName}
                transactionType={transactionType ?? ''}
                comparisonEnabled={comparisonEnabled}
                offset={offset}
              >
                {transactionName}
              </TransactionDetailLink>
            }
          />
        );
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate('xpack.apm.errorGroupTopTransactions.column.occurrences', {
        defaultMessage: 'Error occurrences',
      }),
      align: RIGHT_ALIGNMENT,
      dataType: 'number',
      render: (_, { occurrences, currentPeriodTimeseries, previousPeriodTimeseries }) => {
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.ERROR_OCCURRENCES
        );

        return (
          <SparkPlot
            type="bar"
            isLoading={loading}
            valueLabel={i18n.translate(
              'xpack.apm.errorGroupTopTransactions.column.occurrences.valueLabel',
              {
                defaultMessage: `{occurrences} occ.`,
                values: {
                  occurrences: asInteger(occurrences),
                },
              }
            )}
            series={currentPeriodTimeseries}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimeseries : undefined
            }
            color={currentPeriodColor}
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.errorGroupTopTransactions.title', {
            defaultMessage: 'Top 5 affected transactions',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={data.topErroneousTransactions}
        columns={columns}
        rowHeader="transactionName"
        loading={loading}
        data-test-subj="topErroneousTransactionsTable"
        error={
          status === FETCH_STATUS.FAILURE
            ? i18n.translate('xpack.apm.errorGroupTopTransactions.errorMessage', {
                defaultMessage: 'Failed to fetch',
              })
            : ''
        }
        noItemsMessage={
          loading
            ? i18n.translate('xpack.apm.errorGroupTopTransactions.loading', {
                defaultMessage: 'Loading...',
              })
            : i18n.translate('xpack.apm.errorGroupTopTransactions.noResults', {
                defaultMessage: 'No errors found associated with transactions',
              })
        }
      />
    </>
  );
}
