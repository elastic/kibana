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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';

import { ValuesType } from 'utility-types';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { asPercent } from '../../../../../common/utils/formatters';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ErrorDetailLink } from '../../../shared/links/apm/error_detail_link';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';

type TopErrors =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/top_errors'>;

const INITIAL_STATE: TopErrors = {
  topErrors: [],
};

export function TopErrors() {
  const {
    query,
    path: { serviceName },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    transactionType,
    transactionName,
  } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end && transactionType) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/top_errors',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                transactionType,
                transactionName,
                environment,
                kuery,
                start,
                end,
              },
            },
          }
        );
      }
    },
    [
      serviceName,
      transactionType,
      transactionName,
      environment,
      kuery,
      start,
      end,
    ]
  );

  const loading =
    status === FETCH_STATUS.LOADING || status === FETCH_STATUS.NOT_INITIATED;

  const columns: Array<
    EuiBasicTableColumn<ValuesType<TopErrors['topErrors']>>
  > = [
    {
      field: 'errorName',
      width: '90%',
      name: i18n.translate(
        'xpack.apm.transactionDetails.topErrors.column.errorName',
        {
          defaultMessage: 'Error name',
        }
      ),
      render: (_, { errorName, groupId }) => {
        return (
          <TruncateWithTooltip
            text={errorName}
            content={
              <ErrorDetailLink serviceName={serviceName} errorGroupId={groupId}>
                {errorName}
              </ErrorDetailLink>
            }
          />
        );
      },
    },
    {
      field: 'errorRatio',
      align: RIGHT_ALIGNMENT,
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.topErrors.column.errorRatioToolTip',
            {
              defaultMessage:
                'The ratio of the number of occurrences for this error group and transaction group to the total number of occurrences for this transaction group',
            }
          )}
        >
          <>
            {i18n.translate(
              'xpack.apm.transactionDetails.topErrors.column.errorRatio',
              {
                defaultMessage: 'Error ratio',
              }
            )}{' '}
            <EuiIcon
              size="s"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
            />
          </>
        </EuiToolTip>
      ),
      render: (value: string) => asPercent(parseFloat(value), 1),
    },
  ];

  return (
    <>
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.transactionDetails.topErrors.title', {
                defaultMessage: 'Top 5 errors',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ErrorOverviewLink serviceName={serviceName} query={query}>
            {i18n.translate(
              'xpack.apm.transactionDetails.topErrors.errorsTableLinkText',
              {
                defaultMessage: 'View all errors',
              }
            )}
          </ErrorOverviewLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiBasicTable
        items={data.topErrors}
        columns={columns}
        loading={loading}
        data-test-subj="top-errors-for-transaction-table"
        error={
          status === FETCH_STATUS.FAILURE
            ? i18n.translate(
                'xpack.apm.transactionDetails.topErrors.errorMessage',
                { defaultMessage: 'Failed to fetch' }
              )
            : ''
        }
        noItemsMessage={
          loading
            ? i18n.translate('xpack.apm.transactionDetails.topErrors.loading', {
                defaultMessage: 'Loading...',
              })
            : i18n.translate(
                'xpack.apm.transactionDetails.topErrors.noResults',
                {
                  defaultMessage: 'No data found',
                }
              )
        }
      />
    </>
  );
}
