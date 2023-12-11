/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMonitorQueryFilters } from '../monitor_details/hooks/use_monitor_query_filters';
import { ClientPluginsStart } from '../../../../plugin';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';

export const NetworkTimingsBreakdown = ({ monitorQueryId }: { monitorQueryId: string }) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { locationFilter } = useMonitorQueryFilters();

  if (!locationFilter) {
    return <LoadingState />;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>{LAST_24_HOURS}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <ExploratoryViewEmbeddable
        customHeight="250px"
        reportType={ReportTypes.KPI}
        legendIsVisible={false}
        axisTitlesVisibility={{ x: false, yLeft: false, yRight: false }}
        attributes={[
          {
            operationType: 'last_value',
            seriesType: 'area_stacked',
            dataType: 'synthetics',
            name: 'Network timings',
            selectedMetricField: 'network_timings',
            reportDefinitions: { 'monitor.id': [monitorQueryId] },
            time: {
              from: 'now-24h/h',
              to: 'now',
            },
            filters: [
              {
                field: 'synthetics.step.index',
                values: [stepIndex],
              },
              ...locationFilter,
            ],
          },
        ]}
      />
    </>
  );
};

const LAST_24_HOURS = i18n.translate('xpack.synthetics.stepDetailsRoute.last24Hours', {
  defaultMessage: 'Last 24 hours',
});
