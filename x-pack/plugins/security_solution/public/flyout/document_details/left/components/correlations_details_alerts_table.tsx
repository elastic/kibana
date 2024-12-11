/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { type FC, useMemo, useCallback } from 'react';
import { type Criteria, EuiBasicTable, formatDate } from '@elastic/eui';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter } from '@kbn/es-query';
import { isRight } from 'fp-ts/lib/Either';
import { ALERT_REASON, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { CellTooltipWrapper } from '../../shared/components/cell_tooltip_wrapper';
import type { DataProvider } from '../../../../../common/types';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import { InvestigateInTimelineButton } from '../../../../common/components/event_details/investigate_in_timeline_button';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';
import { getDataProvider } from '../../../../common/components/event_details/use_action_cell_data_provider';
import { AlertPreviewButton } from '../../../shared/components/alert_preview_button';
import { PreviewLink } from '../../../shared/components/preview_link';
import { useDocumentDetailsContext } from '../../shared/context';

export const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
const dataProviderLimit = 5;

export interface CorrelationsDetailsAlertsTableProps {
  /**
   * Text to display in the ExpandablePanel title section
   */
  title: ReactElement;
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
   * No data message to render if the table is empty
   */
  noItemsMessage?: ReactNode;
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
  noItemsMessage,
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
  const isPreviewEnabled = !useIsExperimentalFeatureEnabled('entityAlertPreviewDisabled');

  const { isPreview } = useDocumentDetailsContext();

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
      .map((hit) => ({ fields: hit.fields ?? {}, id: hit._id, index: hit._index }))
      .map((dataWithMeta) => {
        const res = Object.keys(dataWithMeta.fields).reduce((result, fieldName) => {
          result[fieldName] =
            dataWithMeta.fields?.[fieldName]?.[0] || dataWithMeta.fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>);
        res.id = dataWithMeta.id;
        res.index = dataWithMeta.index;
        return res;
      });
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

  const columns = useMemo(
    () => [
      ...(isPreviewEnabled
        ? [
            {
              render: (row: Record<string, unknown>) => (
                <AlertPreviewButton
                  id={row.id as string}
                  indexName={row.index as string}
                  data-test-subj={`${dataTestSubj}AlertPreviewButton`}
                  scopeId={scopeId}
                />
              ),
              width: '5%',
            },
          ]
        : []),
      {
        field: '@timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.timestampColumnLabel"
            defaultMessage="Timestamp"
          />
        ),
        truncateText: true,
        dataType: 'date' as const,
        render: (value: string) => {
          const date = formatDate(value, TIMESTAMP_DATE_FORMAT);
          return (
            <CellTooltipWrapper tooltip={date}>
              <span>{date}</span>
            </CellTooltipWrapper>
          );
        },
      },
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.ruleColumnLabel"
            defaultMessage="Rule"
          />
        ),
        truncateText: true,
        render: (row: Record<string, unknown>) => {
          const ruleName = row[ALERT_RULE_NAME] as string;
          const ruleId = row['kibana.alert.rule.uuid'] as string;
          return (
            <CellTooltipWrapper tooltip={ruleName}>
              {isPreviewEnabled ? (
                <PreviewLink
                  field={ALERT_RULE_NAME}
                  value={ruleName}
                  scopeId={scopeId}
                  ruleId={ruleId}
                  isPreview={isPreview}
                  data-test-subj={`${dataTestSubj}RulePreview`}
                >
                  <span>{ruleName}</span>
                </PreviewLink>
              ) : (
                <span>{ruleName}</span>
              )}
            </CellTooltipWrapper>
          );
        },
      },
      {
        field: ALERT_REASON,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.reasonColumnLabel"
            defaultMessage="Reason"
          />
        ),
        truncateText: true,
        render: (value: string) => (
          <CellTooltipWrapper tooltip={value} anchorPosition="left">
            <span>{value}</span>
          </CellTooltipWrapper>
        ),
      },
      {
        field: 'kibana.alert.severity',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.correlations.severityColumnLabel"
            defaultMessage="Severity"
          />
        ),
        truncateText: true,
        render: (value: string) => {
          const decodedSeverity = Severity.decode(value);
          const renderValue = isRight(decodedSeverity) ? (
            <SeverityBadge value={decodedSeverity.right} />
          ) : (
            <p>{value}</p>
          );
          return <CellTooltipWrapper tooltip={value}>{renderValue}</CellTooltipWrapper>;
        },
      },
    ],
    [isPreviewEnabled, scopeId, dataTestSubj, isPreview]
  );

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: 'warning',
        headerContent:
          alertIds && alertIds.length && alertIds.length > 0 ? (
            <div data-test-subj={`${dataTestSubj}InvestigateInTimeline`}>
              <InvestigateInTimelineButton
                dataProviders={dataProviders}
                filters={filters}
                asEmptyButton
                iconType="timeline"
              >
                {ACTION_INVESTIGATE_IN_TIMELINE}
              </InvestigateInTimelineButton>
            </div>
          ) : null,
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
        noItemsMessage={noItemsMessage}
      />
    </ExpandablePanel>
  );
};

const getFilters = (alertIds?: string[]) => {
  if (alertIds && alertIds.length) {
    return [
      {
        meta: {
          alias: i18n.translate(
            'xpack.securitySolution.flyout.left.insights.correlations.tableFilterLabel',
            {
              defaultMessage: 'Correlations Details Table Alert IDs.',
            }
          ),
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
