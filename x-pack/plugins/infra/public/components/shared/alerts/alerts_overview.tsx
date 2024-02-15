/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsCount } from '../../../hooks/use_alerts_count';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { AlertsEsQuery } from '../../../utils/filters/create_alerts_es_query';
import { infraAlertFeatureIds } from './constants';

interface AlertsOverviewProps {
  alertsQuery: AlertsEsQuery;
  dateRange: TimeRange;
  onLoaded: (alertsCount?: AlertsCount) => void;
}

export const AlertsOverview = React.memo(
  ({ alertsQuery, dateRange, onLoaded }: AlertsOverviewProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const {
      charts,
      triggersActionsUi: {
        getAlertsStateTable: AlertsStateTable,
        alertsTableConfigurationRegistry,
        getAlertSummaryWidget: AlertSummaryWidget,
      },
    } = services;

    const chartProps = {
      baseTheme: charts.theme.useChartsBaseTheme(),
    };

    return (
      <div>
        <AlertSummaryWidget
          chartProps={chartProps}
          featureIds={infraAlertFeatureIds}
          filter={alertsQuery}
          timeRange={summaryTimeRange}
          onLoaded={onLoaded}
          fullSize
        />
        <AlertsStateTable
          alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
          id={'assetDetailsAlertsTable'}
          configurationId={AlertConsumers.OBSERVABILITY}
          featureIds={[...infraAlertFeatureIds, AlertConsumers.OBSERVABILITY]}
          showAlertStatusWithFlapping
          query={alertsQuery}
          pageSize={5}
        />
      </div>
    );
  }
);
