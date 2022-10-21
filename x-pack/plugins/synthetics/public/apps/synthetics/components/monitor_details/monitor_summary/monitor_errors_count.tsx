/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorErrorsCount = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <ExploratoryViewEmbeddable
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: {
            from: 'now-1h',
            to: 'now',
          },
          reportDefinitions: { config_id: [monitorId] },
          dataType: 'synthetics',
          selectedMetricField: 'state.id',
          name: 'synthetics-series-1',
        },
      ]}
    />
  );
};
