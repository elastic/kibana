/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorFailedTests = ({ time }: { time: { to: string; from: string } }) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <ExploratoryViewEmbeddable
      customHeight={'120px'}
      reportType="heatmap"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={false}
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.id': [monitorId],
          },
          dataType: 'synthetics',
          selectedMetricField: 'failed_tests',
          name: 'synthetics-series-1',
        },
      ]}
    />
  );
};
