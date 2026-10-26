/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import { useMemo } from 'react';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { getTimeZone } from '../charts/helper/timezone';
import { useTransactionDetailFlyoutContext } from './transaction_detail_flyout_context';

const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

function formatInConfiguredTimezone(iso: string, dateFormat: string, timeZone: string): string {
  if (timeZone === 'local') {
    return moment(iso).format(dateFormat);
  }
  return moment.tz(iso, timeZone).format(dateFormat);
}

export interface TransactionDetailFlyoutSummaryItem {
  id: 'environment' | 'transactionType' | 'dateRange';
  title: string;
  value: string;
}

/** Resolves the environment, transaction type, and date range shown as header meta blocks. */
export function useTransactionDetailFlyoutSummaryItems(): TransactionDetailFlyoutSummaryItem[] {
  const {
    deps: { core },
    filters: { transactionType, environment, rangeFrom, rangeTo, start, end },
  } = useTransactionDetailFlyoutContext();

  const dateFormat = core.uiSettings?.get<string>('dateFormat') || DEFAULT_DATE_FORMAT;
  const timeZone = getTimeZone(core.uiSettings);

  const startLabel = start ? formatInConfiguredTimezone(start, dateFormat, timeZone) : rangeFrom;
  const endLabel = end ? formatInConfiguredTimezone(end, dateFormat, timeZone) : rangeTo;
  const dateRangeLabel = i18n.translate(
    'xpack.apm.transactionDetailFlyout.summary.dateRangeValue',
    {
      defaultMessage: '{start} → {end}',
      values: { start: startLabel, end: endLabel },
    }
  );

  return useMemo(
    () => [
      {
        id: 'environment',
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.environmentLabel', {
          defaultMessage: 'Environment',
        }),
        value: getEnvironmentLabel(environment),
      },
      {
        id: 'transactionType',
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.transactionTypeLabel', {
          defaultMessage: 'Transaction type',
        }),
        value: transactionType,
      },
      {
        id: 'dateRange',
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.dateRangeLabel', {
          defaultMessage: 'Date range',
        }),
        value: dateRangeLabel,
      },
    ],
    [environment, transactionType, dateRangeLabel]
  );
}
