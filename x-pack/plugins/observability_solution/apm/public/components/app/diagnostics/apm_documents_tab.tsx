/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { orderBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { asBigNumber, asInteger } from '../../../../common/utils/formatters';
import type { ApmEvent } from '../../../../server/routes/diagnostics/bundle/get_apm_events';
import { useAdHocApmDataView } from '../../../hooks/use_adhoc_apm_data_view';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ApmPluginStartDeps } from '../../../plugin';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { useDiagnosticsContext } from './context/use_diagnostics';

export function DiagnosticsApmDocuments() {
  const { diagnosticsBundle, isImported } = useDiagnosticsContext();
  const { discover } = useKibana<ApmPluginStartDeps>().services;
  const { dataView } = useAdHocApmDataView();

  const [sortField, setSortField] = useState<keyof ApmEvent>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/diagnostics/documents');

  const items = useMemo<ApmEvent[]>(() => {
    return (
      diagnosticsBundle?.apmEvents.filter(({ legacy, docCount, intervals }) => {
        const isLegacyAndUnused =
          legacy === true &&
          docCount === 0 &&
          intervals &&
          Object.values(intervals).every((interval) => interval.eventDocCount === 0);

        return !isLegacyAndUnused;
      }) ?? []
    );
  }, [diagnosticsBundle?.apmEvents]);

  const columns: Array<EuiBasicTableColumn<ApmEvent>> = [
    {
      name: 'Name',
      field: 'name',
      width: '30%',
    },
    {
      name: 'Doc count',
      field: 'docCount',
      render: (_, { docCount }) => (
        <EuiToolTip content={`${asInteger(docCount)} docs`}>
          <div style={{ cursor: 'pointer' }}>{asBigNumber(docCount)}</div>
        </EuiToolTip>
      ),
      sortable: true,
    },
    {
      name: '1m',
      field: 'intervals.1m',
      render: (_, { intervals }) => {
        const interval = intervals?.['1m'];
        return <IntervalDocCount interval={interval} />;
      },
    },
    {
      name: '10m',
      field: 'intervals.10m',
      render: (_, { intervals }) => {
        const interval = intervals?.['10m'];
        return <IntervalDocCount interval={interval} />;
      },
    },
    {
      name: '60m',
      field: 'intervals.60m',
      render: (_, { intervals }) => {
        const interval = intervals?.['60m'];
        return <IntervalDocCount interval={interval} />;
      },
    },
    {
      name: 'Actions',
      actions: dataView
        ? [
            {
              name: 'View',
              description: 'View in Discover',
              type: 'icon',
              icon: 'discoverApp',
              onClick: async (item) => {
                await discover?.locator?.navigate({
                  query: {
                    language: 'kuery',
                    query: item.kuery,
                  },
                  dataViewId: dataView?.id ?? '',
                  timeRange:
                    rangeTo && rangeFrom
                      ? {
                          to: rangeTo,
                          from: rangeFrom,
                        }
                      : undefined,
                });
              },
            },
          ]
        : [],
    },
  ];

  return (
    <>
      {isImported && diagnosticsBundle ? (
        <>
          <EuiBadge>
            {i18n.translate('xpack.apm.diagnosticsApmDocuments.from:BadgeLabel', {
              defaultMessage: 'From: {date}',
              values: {
                date: new Date(diagnosticsBundle.params.start).toISOString(),
              },
            })}
          </EuiBadge>
          <EuiBadge>
            {i18n.translate('xpack.apm.diagnosticsApmDocuments.to:BadgeLabel', {
              defaultMessage: 'To: {date}',
              values: {
                date: new Date(diagnosticsBundle.params.end).toISOString(),
              },
            })}
          </EuiBadge>
          <EuiBadge>
            {i18n.translate('xpack.apm.diagnosticsApmDocuments.filter:BadgeLabel', {
              defaultMessage: 'Filter:',
            })}
            {diagnosticsBundle?.params.kuery ?? (
              <em>
                {i18n.translate('xpack.apm.diagnosticsApmDocuments.em.emptyLabel', {
                  defaultMessage: 'Empty',
                })}
              </em>
            )}
          </EuiBadge>
          <EuiSpacer />
        </>
      ) : (
        <SearchBar />
      )}

      <EuiBasicTable
        data-test-subj="documents-table"
        items={orderBy(items, sortField, sortDirection)}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
        rowHeader="firstName"
        columns={columns}
        onChange={({ sort }) => {
          if (sort) {
            setSortField(sort.field);
            setSortDirection(sort.direction);
          }
        }}
      />
    </>
  );
}

function IntervalDocCount({
  interval,
}: {
  interval?: {
    metricDocCount: number;
    eventDocCount: number;
  };
}) {
  if (interval === undefined) {
    return <>-</>;
  }

  return (
    <EuiToolTip
      content={`${asInteger(interval.metricDocCount)} docs / ${asInteger(
        interval.eventDocCount
      )} events`}
    >
      <div style={{ cursor: 'pointer' }}>
        {asBigNumber(interval.metricDocCount)}&nbsp;
        <EuiText css={{ fontStyle: 'italic', fontSize: '80%', display: 'inline' }}>
          {i18n.translate('xpack.apm.intervalDocCount.TextLabel', {
            defaultMessage: '({docCount} {docCount, plural, one {event} other {events}})',
            values: {
              docCount: asBigNumber(interval.eventDocCount),
            },
          })}
        </EuiText>
      </div>
    </EuiToolTip>
  );
}
