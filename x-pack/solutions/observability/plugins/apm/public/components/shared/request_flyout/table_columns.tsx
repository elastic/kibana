/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { APM_EBT_ACTIONS } from '../../app/ebt_constants';
import { ImpactBar } from '../impact_bar';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { RowActionsMenu } from './row_actions_menu';

const DASH = '—';

const LABELS = {
  type: i18n.translate('xpack.apm.requestFlyout.table.typeColumn', { defaultMessage: 'Type' }),
  avgTime: i18n.translate('xpack.apm.requestFlyout.table.avgTimeColumn', {
    defaultMessage: 'Avg time',
  }),
  calls: i18n.translate('xpack.apm.requestFlyout.table.callsColumn', { defaultMessage: 'Calls' }),
  failed: i18n.translate('xpack.apm.requestFlyout.table.failedColumn', {
    defaultMessage: 'Failed',
  }),
  timeConsumed: i18n.translate('xpack.apm.requestFlyout.table.timeConsumedColumn', {
    defaultMessage: 'Time consumed',
  }),
  actions: i18n.translate('xpack.apm.requestFlyout.table.actionsColumn', {
    defaultMessage: 'Actions',
  }),
  viewTracesInDiscover: i18n.translate('xpack.apm.requestFlyout.table.viewTracesInDiscover', {
    defaultMessage: 'View traces in Discover',
  }),
};

export function getTypeColumn<T extends object>(field: keyof T & string): EuiBasicTableColumn<T> {
  return {
    field,
    width: '14%',
    name: LABELS.type,
    render: (value: string | undefined) =>
      value ? <EuiBadge color="hollow">{value}</EuiBadge> : DASH,
  };
}

export function getAvgTimeColumn<T extends object>(
  field: keyof T & string
): EuiBasicTableColumn<T> {
  return {
    field,
    name: LABELS.avgTime,
    align: 'right',
    render: (value: number | null) => (value == null ? DASH : asMillisecondDuration(value)),
  };
}

export function getCallRateColumn<T extends object>(
  field: keyof T & string
): EuiBasicTableColumn<T> {
  return {
    field,
    name: LABELS.calls,
    align: 'right',
    render: (value: number | null) => (value == null ? DASH : asTransactionRate(value)),
  };
}

export function getFailureRateColumn<T extends object>(
  field: keyof T & string
): EuiBasicTableColumn<T> {
  return {
    field,
    name: LABELS.failed,
    align: 'right',
    render: (value: number | null) => (value == null ? DASH : asPercent(value, 1)),
  };
}

export function getTimeConsumedColumn<T extends object>(
  field: keyof T & string,
  { isFraction = false }: { isFraction?: boolean } = {}
): EuiBasicTableColumn<T> {
  return {
    field,
    name: LABELS.timeConsumed,
    align: 'right',
    render: (value: number | null) =>
      value == null ? DASH : <ImpactBar value={isFraction ? value * 100 : value} size="m" />,
  };
}

/** Actions column with a "View traces in Discover" item; rows without a link have no menu. */
export function getViewTracesColumn<T extends object>({
  getRowId,
  getHref,
}: {
  getRowId: (item: T) => string;
  getHref: (item: T) => string | undefined;
}): EuiBasicTableColumn<T> {
  return {
    name: LABELS.actions,
    align: 'right',
    render: (item: T) => {
      const href = getHref(item);
      if (!href) {
        return null;
      }
      return (
        <RowActionsMenu
          id={getRowId(item)}
          actions={[
            {
              id: 'rowActions',
              actions: [
                {
                  id: 'viewInDiscover',
                  name: LABELS.viewTracesInDiscover,
                  icon: 'discoverApp',
                  href,
                  ebt: {
                    action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                    element: REQUEST_FLYOUT_EBT_ELEMENTS.ROW_ACTIONS_MENU,
                  },
                },
              ],
            },
          ]}
        />
      );
    },
  };
}
