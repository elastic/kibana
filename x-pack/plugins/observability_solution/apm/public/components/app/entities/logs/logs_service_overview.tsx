/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroupProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiCallOut,
  EuiSpacer,
  EuiTitle,
  EuiEmptyPrompt,
  EuiButton,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dashboardsDark, dashboardsLight } from '@kbn/shared-svg';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ServiceOverviewThroughputChart } from '../../service_overview/service_overview_throughput_chart';
import { TransactionsTable } from '../../../shared/transactions_table';
import { MostUsedCharts } from '../mobile/most_used_charts';
import { GeoMap } from '../mobile/geo_map';
import { FailedTransactionRateChart } from '../../../shared/charts/failed_transaction_rate_chart';
import { ServiceOverviewDependenciesTable } from '../../service_overview/service_overview_dependencies_table';
import { LatencyChart } from '../../../shared/charts/latency_chart';
import { useFiltersForEmbeddableCharts } from '../../../../hooks/use_filters_for_embeddable_charts';
import { getKueryWithMobileFilters } from '../../../../../common/utils/get_kuery_with_mobile_filters';
import { MobileStats } from '../mobile/stats/stats';
import { MobileLocationStats } from '../mobile/stats/location_stats';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { AddAPMCallOut } from './add_apm_callout';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function LogsServiceOverview() {
  const { serviceName } = useApmServiceContext();
  const router = useApmRouter();
  const { dataView } = useAdHocApmDataView();

  const {
    query,
    query: { environment, kuery, rangeFrom, rangeTo, offset, comparisonEnabled },
  } = useApmParams('/logs-services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const latencyChartHeight = 200;
  const nonLatencyChartHeight = isSingleColumn ? latencyChartHeight : chartHeight;

  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn ? 'column' : 'row';

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        <AddAPMCallOut />
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={8}>
                  <div>
                    {i18n.translate('xpack.apm.logsServiceOverview.div.oneChartLabel', {
                      defaultMessage: 'one chart',
                    })}
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <div>
                    {i18n.translate('xpack.apm.logsServiceOverview.div.oneChartLabel', {
                      defaultMessage: 'one chart',
                    })}
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
