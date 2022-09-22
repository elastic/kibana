/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes, useTheme } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';

export const AvailabilitySparklines = () => {
  const {
    services: {
      observability: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const { monitorId } = useParams<{ monitorId: string }>();

  const theme = useTheme();

  return (
    <>
      <ExploratoryViewEmbeddable
        reportType={ReportTypes.KPI}
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={false}
        hideTicks={true}
        attributes={[
          {
            seriesType: 'area',
            time: { from: 'now-15m/m', to: 'now' },
            name: 'Monitor availability',
            dataType: 'synthetics',
            selectedMetricField: 'monitor_availability',
            reportDefinitions: { 'monitor.id': [monitorId] },
            color: theme.eui.euiColorVis1,
          },
        ]}
      />
    </>
  );
};
