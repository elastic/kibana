/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { EuiLoadingContent } from '@elastic/eui';
import { ClientPluginsStart } from '../../../../../../../plugin';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  locationLabel?: string;
  monitorId: string[];
}

export const OverviewErrorsCount = ({
  monitorId,
  from,
  to,
  locationLabel,
}: MonitorErrorsCountProps) => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const time = useMemo(() => ({ from, to }), [from, to]);

  if (!monitorId) {
    return <EuiLoadingContent lines={3} />;
  }

  return (
    <ExploratoryViewEmbeddable
      align="left"
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.id': monitorId,
            ...(locationLabel ? { 'observer.geo.name': [locationLabel] } : {}),
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: 'synthetics-series-1',
        },
      ]}
    />
  );
};
