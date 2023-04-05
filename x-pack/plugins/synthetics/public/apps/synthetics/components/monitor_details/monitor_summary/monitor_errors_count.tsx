/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  monitorId: string[];
  id: string;
}

export const MonitorErrorsCount = ({ monitorId, from, to, id }: MonitorErrorsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const selectedLocation = useSelectedLocation();

  const time = useMemo(() => ({ from, to }), [from, to]);

  if (!selectedLocation || !monitorId) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id={id}
      align="left"
      customHeight="70px"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time,
          reportDefinitions: {
            'monitor.id': monitorId,
            'observer.geo.name': [selectedLocation?.label],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_errors',
          name: ERRORS_LABEL,
        },
      ]}
    />
  );
};

export const ERRORS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.errors', {
  defaultMessage: 'Errors',
});
