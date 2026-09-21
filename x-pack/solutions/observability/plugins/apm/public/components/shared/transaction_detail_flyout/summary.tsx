/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSkeletonText, EuiText, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { useTransactionDetailFlyoutContext } from './transaction_detail_flyout_context';

const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

interface SummaryRow {
  id: string;
  label: string;
  value: string;
}

function SummaryRowView({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: minmax(120px, 35%) 1fr;
        gap: ${euiTheme.size.m};
        align-items: center;
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${euiTheme.border.thin};
        font-size: ${fontSize};

        &:first-child {
          padding-top: 0;
        }

        &:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }
      `}
    >
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        <span>{label}</span>
      </EuiText>
      <EuiText size="xs" color="subdued">
        {isLoading ? (
          <EuiSkeletonText lines={1} size="xs" />
        ) : (
          <span className="eui-textBreakWord">{value}</span>
        )}
      </EuiText>
    </div>
  );
}

export function TransactionDetailFlyoutSummary() {
  const {
    deps: { core },
    filters: { transactionType, environment, rangeFrom, rangeTo, start, end },
  } = useTransactionDetailFlyoutContext();

  const dateFormat = core.uiSettings?.get<string>('dateFormat') || DEFAULT_DATE_FORMAT;

  const filterKey = `${environment}|${transactionType}|${start}|${end}`;
  const [settledFilterKey, setSettledFilterKey] = useState(filterKey);
  const isFirstRender = useRef(true);
  const isUpdating = !isFirstRender.current && settledFilterKey !== filterKey;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setSettledFilterKey(filterKey);
      return;
    }
    const timeoutId = window.setTimeout(() => setSettledFilterKey(filterKey), 400);
    return () => window.clearTimeout(timeoutId);
  }, [filterKey]);

  const startLabel = start ? moment(start).format(dateFormat) : rangeFrom;
  const endLabel = end ? moment(end).format(dateFormat) : rangeTo;
  const dateRangeLabel = i18n.translate(
    'xpack.apm.transactionDetailFlyout.summary.dateRangeValue',
    {
      defaultMessage: '{start} → {end}',
      values: { start: startLabel, end: endLabel },
    }
  );

  const rows = useMemo<SummaryRow[]>(
    () => [
      {
        id: 'environment',
        label: i18n.translate('xpack.apm.transactionDetailFlyout.summary.environmentLabel', {
          defaultMessage: 'Environment',
        }),
        value: getEnvironmentLabel(environment),
      },
      {
        id: 'transactionType',
        label: i18n.translate('xpack.apm.transactionDetailFlyout.summary.transactionTypeLabel', {
          defaultMessage: 'Transaction type',
        }),
        value: transactionType,
      },
      {
        id: 'dateRange',
        label: i18n.translate('xpack.apm.transactionDetailFlyout.summary.dateRangeLabel', {
          defaultMessage: 'Date range',
        }),
        value: dateRangeLabel,
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
      data-loading={isUpdating ? 'true' : 'false'}
    >
      {rows.map((row) => (
        <SummaryRowView key={row.id} label={row.label} value={row.value} isLoading={isUpdating} />
      ))}
    </EuiPanel>
  );
}
