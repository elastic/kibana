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

import { Position } from '@elastic/charts/dist/utils/common';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { useAbsoluteDate } from '../../../hooks';

export const StepDurationPanel = ({
  legendPosition,
  doBreakdown = true,
}: {
  legendPosition?: Position;
  doBreakdown?: boolean;
}) => {
  const { observability } = useKibana<ClientPluginsStart>().services;
  const time = useAbsoluteDate({ from: 'now-24h/h', to: 'now' });

  const { ExploratoryViewEmbeddable } = observability;

  const { monitor } = useSelectedMonitor();

  const monitorId = useMonitorQueryId();

  const selectedLocation = useSelectedLocation();

  const isBrowser = monitor?.type === 'browser';

  if (!selectedLocation) {
    return null;
  }

  if (!monitorId) {
    return null;
  }

  const label = !doBreakdown
    ? MONITOR_DURATION
    : isBrowser
    ? DURATION_BY_STEP_LABEL
    : DURATION_BY_LOCATION;

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{label}</h3>
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
        legendPosition={legendPosition}
        legendIsVisible={doBreakdown}
        attributes={[
          {
            time,
            name: label,
            reportDefinitions: {
              'monitor.id': [monitorId],
              'observer.geo.name': [selectedLocation?.label],
            },
            selectedMetricField:
              isBrowser && doBreakdown ? 'synthetics.step.duration.us' : 'monitor.duration.us',
            dataType: 'synthetics',
            operationType: doBreakdown ? 'last_value' : 'average',
            seriesType: 'area_stacked',
            ...(doBreakdown
              ? { breakdown: isBrowser ? 'synthetics.step.name.keyword' : 'observer.geo.name' }
              : {}),
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

const MONITOR_DURATION = i18n.translate('xpack.synthetics.detailsPanel.monitorDuration', {
  defaultMessage: 'Monitor duration',
});

const LAST_24H_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last24Hours', {
  defaultMessage: 'Last 24 hours',
});
