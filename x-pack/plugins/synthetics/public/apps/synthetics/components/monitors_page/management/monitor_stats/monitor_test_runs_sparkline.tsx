/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';

import { ClientPluginsStart } from '../../../../../../plugin';

interface Props {
  from?: string;
  to?: string;
}
export const MonitorTestRunsSparkline = ({ from = 'now-30d', to = 'now' }: Props) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const theme = useTheme();

  return (
    <ExploratoryViewEmbeddable
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          seriesType: 'area',
          time: { from, to },
          reportDefinitions: {
            'monitor.id': [],
            'observer.geo.name': [],
          },
          dataType: 'synthetics',
          selectedMetricField: 'state.id',
          name: 'Monitor complete',
          color: theme.eui.euiColorVis1,
          operationType: 'unique_count',
        },
      ]}
      customHeight={'68px'}
    />
  );
};
