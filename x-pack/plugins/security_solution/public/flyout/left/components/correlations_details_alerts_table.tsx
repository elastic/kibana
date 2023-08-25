/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useCallback } from 'react';
import { type Criteria, EuiBasicTable, formatDate } from '@elastic/eui';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter } from '@kbn/es-query';
import { isRight } from 'fp-ts/lib/Either';
import { ALERT_REASON, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { DataProvider } from '../../../../common/types';
import { SeverityBadge } from '../../../detections/components/rules/severity_badge';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import * as i18n from './translations';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { InvestigateInTimelineButton } from '../../../common/components/event_details/table/investigate_in_timeline_button';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../detections/components/alerts_table/translations';
import { getDataProvider } from '../../../common/components/event_details/table/use_action_cell_data_provider';
import { INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID } from './test_ids';

export const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
const dataProviderLimit = 5;

export const columns = [
  {
    field: '@timestamp',
    name: i18n.CORRELATIONS_TIMESTAMP_COLUMN_TITLE,
    truncateText: true,
    dataType: 'date' as const,
    render: (value: string) => formatDate(value, TIMESTAMP_DATE_FORMAT),
  },
  {
    field: ALERT_RULE_NAME,
    name: i18n.CORRELATIONS_RULE_COLUMN_TITLE,
    truncateText: true,
  },
  {
    field: ALERT_REASON,
    name: i18n.CORRELATIONS_REASON_COLUMN_TITLE,
    truncateText: true,
  },
  {
    field: 'kibana.alert.severity',
    name: i18n.CORRELATIONS_SEVERITY_COLUMN_TITLE,
    truncateText: true,
    render: (value: string) => {
      const decodedSeverity = Severity.decode(value);
      return isRight(decodedSeverity) ? <SeverityBadge value={decodedSeverity.right} /> : value;
    },
  },
];

export interface CorrelationsDetailsAlertsTableProps {
  /**
   * Text to display in the ExpandablePanel title section
   */
  title: string;
  /**
   * Whether the table is loading
   */
  loading: boolean;
  /**
   * Ids of alerts to display in the table
   */
  alertIds: string[] | undefined;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Renders paginated alert array based on the provided alertIds
 */
export const CorrelationsDetailsAlertsTable: FC<CorrelationsDetailsAlertsTableProps> = ({
  title,
  loading,
  alertIds,
  scopeId,
  eventId,
  'data-test-subj': dataTestSubj,
}) => {
  const {
    setPagination,
    setSorting,
    data,
    loading: alertsLoading,
    paginationConfig,
    sorting,
    error,
  } = usePaginatedAlerts(alertIds || []);

  const onTableChange = useCallback(
    ({ page, sort }: Criteria<Record<string, unknown>>) => {
      if (page) {
        const { index: pageIndex, size: pageSize } = page;
        setPagination({ pageIndex, pageSize });
      }

      if (sort) {
        setSorting(sort);
      }
    },
    [setPagination, setSorting]
  );

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields = {}) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields?.[fieldName]?.[0] || fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);

  const shouldUseFilters = Boolean(
    alertIds && alertIds.length && alertIds.length >= dataProviderLimit
  );
  const dataProviders = useMemo(
    () => (shouldUseFilters ? null : getDataProviders(scopeId, eventId, alertIds)),
    [alertIds, shouldUseFilters, scopeId, eventId]
  );
  const filters: Filter[] | null = useMemo(
    () => (shouldUseFilters ? getFilters(alertIds) : null),
    [alertIds, shouldUseFilters]
  );

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: 'warning',
        headerContent: (
          <div data-test-subj={INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID}>
            <InvestigateInTimelineButton
              dataProviders={dataProviders}
              filters={filters}
              asEmptyButton
              iconType="timeline"
            >
              {ACTION_INVESTIGATE_IN_TIMELINE}
            </InvestigateInTimelineButton>
          </div>
        ),
      }}
      content={{ error }}
      expand={{
        expandable: true,
        expandedOnFirstRender: true,
      }}
      data-test-subj={dataTestSubj}
    >
      <EuiBasicTable<Record<string, unknown>>
        data-test-subj={`${dataTestSubj}Table`}
        loading={loading || alertsLoading}
        items={mappedData}
        columns={columns}
        pagination={paginationConfig}
        sorting={sorting}
        onChange={onTableChange}
      />
    </ExpandablePanel>
  );
};

const getFilters = (alertIds?: string[]) => {
  if (alertIds && alertIds.length) {
    return [
      {
        meta: {
          alias: i18n.CORRELATIONS_DETAILS_TABLE_FILTER,
          type: 'phrases',
          key: '_id',
          params: [...alertIds],
          negate: false,
          disabled: false,
          value: alertIds.join(),
        },
        query: {
          bool: {
            should: alertIds.map((id) => {
              return {
                match_phrase: {
                  _id: id,
                },
              };
            }),
            minimum_should_match: 1,
          },
        },
      },
    ];
  }
  return null;
};

const getDataProviders = (scopeId: string, eventId: string, alertIds?: string[]) => {
  if (alertIds && alertIds.length) {
    return alertIds.reduce<DataProvider[]>((result, alertId, index) => {
      const id = `${scopeId}-${eventId}-event.id-${index}-${alertId}`;
      result.push(getDataProvider('_id', id, alertId));
      return result;
    }, []);
  }
  return null;
};
