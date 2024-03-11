/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiText, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import { HostMetricsExplanationContent } from '../../../../../../components/lens';
import { Chart } from './chart';
import { Popover } from '../../common/popover';
import { useMetricsDataViewContext } from '../../../hooks/use_metrics_data_view';

export const MetricsGrid = () => {
  const model = findInventoryModel('host');
  const { dataView } = useMetricsDataViewContext();

  const { value: charts = [] } = useAsync(async () => {
    const { cpu, disk, memory, network } = await model.metrics.getCharts();
    return [
      cpu.xy.cpuUsage,
      cpu.xy.normalizedLoad1m,
      memory.xy.memoryUsage,
      memory.xy.memoryFree,
      disk.xy.diskUsage,
      disk.xy.diskSpaceAvailable,
      disk.xy.diskIORead,
      disk.xy.diskIOWrite,
      disk.xy.diskReadThroughput,
      disk.xy.diskWriteThroughput,
      network.xy.rx,
      network.xy.tx,
    ].map((chart) => ({
      ...chart,
      ...(dataView?.id
        ? {
            dataset: {
              index: dataView.id,
            },
          }
        : {}),
    }));
  }, [dataView?.id]);

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
