/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { isErrorMessage } from '../../../app/correlations/utils/is_error_message';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import type { TransactionDetailFlyoutFilters } from '../types';

export function useTransactionDetailFlyoutTraceSamplesFetcher({
  serviceName,
  transactionName,
  transactionType,
  environment,
  rangeFrom,
  rangeTo,
}: TransactionDetailFlyoutFilters) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const {
    deps: {
      core: { notifications },
    },
  } = useTransactionDetailFlyoutContext();

  const fetchParams = useMemo(
    () => ({
      serviceName,
      transactionName,
      transactionType,
      environment,
      start,
      end,
      kuery: '',
    }),
    [serviceName, transactionName, transactionType, environment, start, end]
  );

  const { data, status, error } = useFetcher(
    (callApmApi) => {
      if (
        fetchParams.serviceName &&
        fetchParams.start &&
        fetchParams.end &&
        fetchParams.transactionType &&
        fetchParams.transactionName
      ) {
        return callApmApi('GET /internal/apm/services/{serviceName}/transactions/traces/samples', {
          params: {
            path: {
              serviceName: fetchParams.serviceName,
            },
            query: {
              environment: fetchParams.environment,
              kuery: fetchParams.kuery,
              start: fetchParams.start,
              end: fetchParams.end,
              transactionType: fetchParams.transactionType,
              transactionName: fetchParams.transactionName,
            },
          },
        });
      }
    },
    [fetchParams]
  );

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.transactionDetailFlyout.traceSample.fetchErrorTitle', {
          defaultMessage: 'An error occurred fetching trace samples.',
        }),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  return useMemo(
    () => ({
      data,
      status,
      error,
    }),
    [data, status, error]
  );
}
