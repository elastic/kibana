/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ServiceMapLink } from '../../../shared/Links/apm/ServiceMapLink';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';
import { getColumns } from './get_columns';

type ServiceDependencies = APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;

interface Props {
  serviceName: string;
}

const INITIAL_STATE = {
  serviceDependencies: [],
} as ServiceDependencies;

export function ServiceOverviewDependenciesTable({ serviceName }: Props) {
  const {
    urlParams: { start, end, environment, comparisonType, comparisonEnabled },
  } = useUrlParams();

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !comparisonStart || !comparisonEnd) {
        return;
      }
      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            environment,
            numBuckets: 20,
            comparisonStart,
            comparisonEnd,
          },
        },
      });
    },
    [start, end, serviceName, environment, comparisonStart, comparisonEnd]
  );

  // need top-level sortable fields for the managed table
  const items = data.serviceDependencies.map((item) => ({
    ...item,
    errorRateValue: item.currentPeriodMetrics.errorRate.value,
    latencyValue: item.currentPeriodMetrics.latency.value,
    throughputValue: item.currentPeriodMetrics.throughput.value,
    impactValue: item.currentPeriodMetrics.impact,
  }));

  const columns = getColumns({
    environment,
    comparisonEnabled,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate(
                  'xpack.apm.serviceOverview.dependenciesTableTitle',
                  {
                    defaultMessage: 'Dependencies',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceMapLink serviceName={serviceName}>
              {i18n.translate(
                'xpack.apm.serviceOverview.dependenciesTableLinkText',
                {
                  defaultMessage: 'View service map',
                }
              )}
            </ServiceMapLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <ServiceOverviewTableContainer
            isEmptyAndLoading={
              items.length === 0 && status === FETCH_STATUS.LOADING
            }
          >
            <EuiInMemoryTable
              columns={columns}
              items={items}
              allowNeutralSort={false}
              loading={status === FETCH_STATUS.LOADING}
              pagination={{
                initialPageSize: 5,
                pageSizeOptions: [5],
                hidePerPageOptions: true,
              }}
              sorting={{
                sort: {
                  direction: 'desc',
                  field: 'impactValue',
                },
              }}
            />
          </ServiceOverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
