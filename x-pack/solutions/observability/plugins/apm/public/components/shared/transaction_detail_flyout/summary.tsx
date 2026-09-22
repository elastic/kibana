/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import React, { useMemo } from 'react';
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

export function TransactionDetailFlyoutSummary() {
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

  const listItems = useMemo(
    () => [
      {
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.environmentLabel', {
          defaultMessage: 'Environment',
        }),
        description: getEnvironmentLabel(environment),
      },
      {
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.transactionTypeLabel', {
          defaultMessage: 'Transaction type',
        }),
        description: transactionType,
      },
      {
        title: i18n.translate('xpack.apm.transactionDetailFlyout.summary.dateRangeLabel', {
          defaultMessage: 'Date range',
        }),
        description: dateRangeLabel,
      },
    ],
    [environment, transactionType, dateRangeLabel]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj="transactionDetailFlyoutSummary"
    >
      <EuiDescriptionList
        compressed
        type="column"
        columnGutterSize="m"
        rowGutterSize="s"
        align="left"
        listItems={listItems}
      />
    </EuiPanel>
  );
}
