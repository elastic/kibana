/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';

import { useRefreshedRange } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../../plugin';
import * as labels from '../labels';

export const MonitorTestRunsSparkline = ({ monitorIds }: { monitorIds: string[] }) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const theme = useTheme();

  const { from, to } = useRefreshedRange(30, 'days');

  const attributes = useMemo(() => {
    return [
      {
        seriesType: 'area' as const,
        time: { from, to },
        reportDefinitions: {
          'monitor.id': monitorIds.length > 0 ? monitorIds : ['false-monitor-id'], // Show no data when monitorIds is empty
        },
        dataType: 'synthetics' as const,
        selectedMetricField: 'monitor.check_group',
        filters: [],
        name: labels.TEST_RUNS_LABEL,
        color: theme.eui.euiColorVis1,
        operationType: 'unique_count',
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, JSON.stringify({ ids: [...monitorIds].sort() }), theme.eui.euiColorVis1, to]);

  return (
    <ExploratoryViewEmbeddable
      id="monitor-test-runs-sparkline"
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={attributes}
      customHeight={'68px'}
    />
  );
};
