/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { useSelectedLocation } from './use_selected_location';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from './use_selected_monitor';

export const useMonitorQueryFilters = (): {
  monitorQueryId?: string;
  queryIdFilter?: Record<string, string[]>;
  locationFilter?: UrlFilter[];
} => {
  const { monitor } = useSelectedMonitor();
  const monitorQueryId = monitor?.[ConfigKey.MONITOR_QUERY_ID];
  const selectedLocation = useSelectedLocation();

  return useMemo(() => {
    if (!monitorQueryId || !selectedLocation) {
      return {};
    }
    return {
      monitorQueryId,
      queryIdFilter: {
        'monitor.id': [monitorQueryId],
      },
      locationFilter: [
        {
          field: 'observer.geo.name',
          // in 8.6.0, observer.geo.name was mapped to the id,
          // so we have to pass both values to maintain history
          values: [selectedLocation.label, selectedLocation.id],
        },
      ],
    };
  }, [monitorQueryId, selectedLocation]);
};
