/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/react-public';
import React from 'react';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { FAILED_TESTS_LABEL } from './failed_tests';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';

export const FailedTestsCount = ({
  from,
  to,
  id,
  location,
}: {
  to: string;
  from: string;
  id: string;
  location: ReturnType<typeof useSelectedLocation>;
}) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const monitorId = useMonitorQueryId();

  const selectedLocation = location;

  if (!monitorId || !selectedLocation) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id={id}
      reportType="single-metric"
      attributes={[
        {
          time: { from, to },
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation?.label],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_failed_tests',
          name: FAILED_TESTS_LABEL,
        },
      ]}
    />
  );
};
