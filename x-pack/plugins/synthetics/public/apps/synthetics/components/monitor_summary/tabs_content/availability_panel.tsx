/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';

export const AvailabilityPanel = () => {
  const {
    services: {
      observability: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <>
      <ExploratoryViewEmbeddable
        align="left"
        reportType={ReportTypes.SINGLE_METRIC}
        attributes={[
          {
            time: { from: 'now-30d', to: 'now' },
            name: 'Monitor availability',
            dataType: 'synthetics',
            selectedMetricField: 'monitor_availability',
            reportDefinitions: { config_id: [monitorId] },
          },
        ]}
      />
    </>
  );
};
