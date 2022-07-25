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
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { ClientPluginsStart } from '../../../../../plugin';
export const StepDurationPanel = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <EuiPanel>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{DURATION_BY_STEP_LABEL}</h3>
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
            selectedMetricField: 'synthetics.step.duration.us',
            dataType: 'synthetics',
            time: { from: 'now-24h/h', to: 'now' },
            breakdown: 'synthetics.step.name.keyword',
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

const LAST_24H_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last24Hours', {
  defaultMessage: 'Last 24 hours',
});
