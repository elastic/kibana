/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';

import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { ClientPluginsStart } from '../../../../../plugin';
export const StepDurationPanel = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitor } = useSelectedMonitor();

  const monitorId = useMonitorQueryId();

  const isBrowser = monitor?.type === 'browser';

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{isBrowser ? DURATION_BY_STEP_LABEL : DURATION_BY_LOCATION}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {LAST_24H_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <ExploratoryViewEmbeddable
        axisTitlesVisibility={{ yLeft: false, yRight: false, x: false }}
        customHeight={'300px'}
        reportType={ReportTypes.KPI}
        attributes={[
          {
            name: DURATION_BY_STEP_LABEL,
            reportDefinitions: { 'monitor.id': [monitorId] },
            selectedMetricField: isBrowser ? 'synthetics.step.duration.us' : 'monitor.duration.us',
            dataType: 'synthetics',
            time: { from: 'now-24h/h', to: 'now' },
            breakdown: isBrowser ? 'synthetics.step.name.keyword' : 'observer.geo.name',
            operationType: 'last_value',
            seriesType: 'area_stacked',
          },
        ]}
      />
    </EuiPanel>
  );
};

const DURATION_BY_STEP_LABEL = i18n.translate('xpack.synthetics.detailsPanel.durationByStep', {
  defaultMessage: 'Duration by step',
});

const DURATION_BY_LOCATION = i18n.translate('xpack.synthetics.detailsPanel.durationByLocation', {
  defaultMessage: 'Duration by location',
});

const LAST_24H_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last24Hours', {
  defaultMessage: 'Last 24 hours',
});
