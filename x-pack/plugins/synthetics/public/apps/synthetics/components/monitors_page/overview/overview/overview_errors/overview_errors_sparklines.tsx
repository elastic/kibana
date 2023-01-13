/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ClientPluginsStart } from '../../../../../../../plugin';

interface Props {
  from: string;
  to: string;
  monitorId: string[];
}
export const OverviewErrorsSparklines = ({ from, to, monitorId }: Props) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { euiTheme } = useEuiTheme();

  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <ExploratoryViewEmbeddable
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      hideTicks={true}
      attributes={[
        {
          time,
          seriesType: 'area',
          reportDefinitions: {
            'monitor.id': monitorId,
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: 'Monitor errors',
          color: euiTheme.colors.danger,
          operationType: 'unique_count',
        },
      ]}
    />
  );
};
