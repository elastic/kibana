/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConnectionStatsItemWithComparisonData } from '../../../../common/connections';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EmptyMessage } from '../empty_message';
import { ITableColumn, ManagedTable } from '../managed_table';
import { OverviewTableContainer } from '../overview_table_container';
import { TruncateWithTooltip } from '../truncate_with_tooltip';
import {
  getSpanMetricColumns,
  SpanMetricGroup,
} from './get_span_metric_columns';

export type DependenciesItem = Omit<
  ConnectionStatsItemWithComparisonData,
  'location'
> & {
  name: string;
  link: React.ReactElement;
};

interface Props {
  dependencies: DependenciesItem[];
  initialPageSize: number;
  fixedHeight?: boolean;
  link?: React.ReactNode;
  title: React.ReactNode;
  nameColumnTitle: React.ReactNode;
  status: FETCH_STATUS;
  compact?: boolean;
  showPerPageOptions?: boolean;
  showSparkPlots?: boolean;
}

type FormattedSpanMetricGroup = SpanMetricGroup & {
  name: string;
  link: React.ReactElement;
};

export function DependenciesTable(props: Props) {
  const {
    dependencies,
    fixedHeight,
    link,
    title,
    nameColumnTitle,
    status,
    compact = true,
    showPerPageOptions = true,
    initialPageSize,
    showSparkPlots,
  } = props;

  const { isLarge } = useBreakpoints();
  const shouldShowSparkPlots = showSparkPlots ?? !isLarge;

  const items: FormattedSpanMetricGroup[] = dependencies.map((dependency) => ({
    name: dependency.name,
    link: dependency.link,
    latency: dependency.currentStats.latency.value,
    throughput: dependency.currentStats.throughput.value,
    failureRate: dependency.currentStats.errorRate.value,
    impact: dependency.currentStats.impact,
    currentStats: {
      latency: dependency.currentStats.latency.timeseries,
      throughput: dependency.currentStats.throughput.timeseries,
      failureRate: dependency.currentStats.errorRate.timeseries,
    },
    previousStats: dependency.previousStats
      ? {
          latency: dependency.previousStats.latency.timeseries,
          throughput: dependency.previousStats.throughput.timeseries,
          failureRate: dependency.previousStats.errorRate.timeseries,
          impact: dependency.previousStats.impact,
        }
      : undefined,
  }));

  const columns: Array<ITableColumn<FormattedSpanMetricGroup>> = [
    {
      field: 'name',
      name: nameColumnTitle,
      render: (_, item) => {
        const { name, link: itemLink } = item;
        return <TruncateWithTooltip text={name} content={itemLink} />;
      },
      sortable: true,
      width: '30%',
    },
    ...getSpanMetricColumns({
      shouldShowSparkPlots,
      comparisonFetchStatus: status,
    }),
  ];

  const noItemsMessage = !compact ? (
    <EmptyMessage
      heading={i18n.translate('xpack.apm.dependenciesTable.notFoundLabel', {
        defaultMessage: 'No dependencies found',
      })}
    />
  ) : (
    i18n.translate('xpack.apm.dependenciesTable.notFoundLabel', {
      defaultMessage: 'No dependencies found',
    })
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="dependenciesTable"
    >
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {link && <EuiFlexItem grow={false}>{link}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer
          fixedHeight={fixedHeight}
          isEmptyAndNotInitiated={
            items.length === 0 && status === FETCH_STATUS.NOT_INITIATED
          }
        >
          <ManagedTable
            isLoading={status === FETCH_STATUS.LOADING}
            error={status === FETCH_STATUS.FAILURE}
            columns={columns}
            items={items}
            noItemsMessage={noItemsMessage}
            initialSortField="impact"
            initialSortDirection="desc"
            pagination={true}
            showPerPageOptions={showPerPageOptions}
            initialPageSize={initialPageSize}
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
