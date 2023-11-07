/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';
import { ClientPluginsStart } from '../../../../../../../plugin';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  locationLabel?: string;
  monitorIds: string[];
  locations?: string[];
}

export const OverviewErrorsCount = ({
  monitorIds,
  from,
  to,
  locations,
}: MonitorErrorsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <ExploratoryViewEmbeddable
      id="overviewErrorsCount"
      align="left"
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.id': monitorIds.length > 0 ? monitorIds : ['false-monitor-id'],
            ...(locations?.length ? { 'observer.geo.name': locations } : {}),
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
        },
      ]}
    />
  );
};
