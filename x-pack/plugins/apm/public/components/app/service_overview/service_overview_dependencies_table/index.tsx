/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceDependencyItem } from '../../../../../server/lib/services/get_service_dependencies';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { ServiceMapLink } from '../../../shared/Links/apm/ServiceMapLink';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { TableLinkFlexItem } from '../table_link_flex_item';
import { AgentIcon } from '../../../shared/AgentIcon';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { SparkPlotWithValueLabel } from '../../../shared/charts/spark_plot/spark_plot_with_value_label';
import { px, unit } from '../../../../style/variables';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceOverviewLink } from '../../../shared/Links/apm/service_overview_link';
import { SpanIcon } from '../../../shared/span_icon';

interface Props {
  serviceName: string;
}

export function ServiceOverviewDependenciesTable({ serviceName }: Props) {
  const columns: Array<EuiBasicTableColumn<ServiceDependencyItem>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnBackend',
        {
          defaultMessage: 'Backend',
        }
      ),
      render: (
        _,
        { name, agentName, serviceName: itemServiceName, spanType, spanSubtype }
      ) => {
        return (
          <TruncateWithTooltip
            text={name}
            content={
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  {agentName ? (
                    <AgentIcon agentName={agentName} />
                  ) : (
                    <SpanIcon type={spanType} subType={spanSubtype} />
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  {itemServiceName ? (
                    <ServiceOverviewLink serviceName={itemServiceName}>
                      {name}
                    </ServiceOverviewLink>
                  ) : (
                    name
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        );
      },
      sortable: true,
    },
    {
      field: 'latency_value',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnLatency',
        {
          defaultMessage: 'Latency',
        }
      ),
      width: px(unit * 10),
      render: (_, { latency }) => {
        return (
          <SparkPlotWithValueLabel
            color="euiColorVis1"
            series={latency.timeseries ?? undefined}
            valueLabel={asDuration(latency.value)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'traffic_value',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnTraffic',
        {
          defaultMessage: 'Traffic',
        }
      ),
      width: px(unit * 10),
      render: (_, { traffic }) => {
        return (
          <SparkPlotWithValueLabel
            compact
            color="euiColorVis0"
            series={traffic.timeseries ?? undefined}
            valueLabel={asTransactionRate(traffic.value)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'error_rate_value',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnErrorRate',
        {
          defaultMessage: 'Error rate',
        }
      ),
      width: px(unit * 10),
      render: (_, { error_rate: errorRate }) => {
        return (
          <SparkPlotWithValueLabel
            compact
            color="euiColorVis7"
            series={errorRate.timeseries ?? undefined}
            valueLabel={asPercent(errorRate.value, 1)}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'impact_value',
      name: i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnImpact',
        {
          defaultMessage: 'Impact',
        }
      ),
      width: px(unit * 4),
      render: (_, { impact }) => {
        return <ImpactBar size="m" value={impact} />;
      },
      sortable: true,
    },
  ];

  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const { data = [], status } = useFetcher(() => {
    if (!start || !end) {
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
          environment: environment || ENVIRONMENT_ALL.value,
          numBuckets: 20,
        },
      },
    });
  }, [start, end, serviceName, environment]);

  const items = data.map((item) => ({
    ...item,
    error_rate_value: item.error_rate.value,
    latency_value: item.latency.value,
    traffic_value: item.traffic.value,
    impact_value: item.impact,
  }));

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
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
          <TableLinkFlexItem>
            <ServiceMapLink serviceName={serviceName}>
              {i18n.translate(
                'xpack.apm.serviceOverview.dependenciesTableLinkText',
                {
                  defaultMessage: 'View service map',
                }
              )}
            </ServiceMapLink>
          </TableLinkFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <EuiInMemoryTable
            columns={columns}
            items={items}
            allowNeutralSort={false}
            sorting={{
              sort: {
                direction: 'desc',
                field: 'impact_value',
              },
            }}
          />
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
