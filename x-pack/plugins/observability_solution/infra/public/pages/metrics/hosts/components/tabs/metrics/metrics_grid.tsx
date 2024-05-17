import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { HostMetricsExplanationContent } from '../../../../../../components/lens';
import { useMetricsCharts } from '../../../hooks/use_metrics_charts';
import { useMetricsDataViewContext } from '../../../hooks/use_metrics_data_view';
import { Popover } from '../../common/popover';
import { Chart } from './chart';

export const MetricsGrid = () => {
  const { dataView } = useMetricsDataViewContext();

  const charts = useMetricsCharts({ dataViewId: dataView?.id });

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {i18n.translate('xpack.infra.metricsGrid.learnMoreAboutMetricsTextLabel', {
              defaultMessage: 'Learn more about metrics',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Popover>
            <HostMetricsExplanationContent />
          </Popover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {charts.map((chartProp, index) => (
          <EuiFlexItem key={index} grow={false}>
            <Chart {...chartProp} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};
