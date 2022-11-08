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

interface DurationSparklinesProps {
  from: string;
  to: string;
}

export const DurationSparklines = (props: DurationSparklinesProps) => {
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
            time: props,
            name: 'Monitor duration',
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            reportDefinitions: { config_id: [monitorId] },
            color: theme.eui.euiColorVis1,
          },
        ]}
      />
    </>
  );
};
