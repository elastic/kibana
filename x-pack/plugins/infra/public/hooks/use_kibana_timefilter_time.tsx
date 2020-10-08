/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useUpdateEffect, useMount } from 'react-use';
import { useKibanaContextForPlugin } from './use_kibana';
import { TimeRange } from '../../../../../src/plugins/data/public';

export const useKibanaTimefilterTime = ({
  from: fromDefault,
  to: toDefault,
}: TimeRange): [typeof getTime, typeof setTime] => {
  const { services } = useKibanaContextForPlugin();

  const getTime = useCallback(() => {
    return services.data.query.timefilter.timefilter.getTime({ from: fromDefault, to: toDefault });
  }, [services.data.query.timefilter.timefilter, fromDefault, toDefault]);

  const setTime = useCallback(
    (timeRange: TimeRange) => {
      services.data.query.timefilter.timefilter.setTime(timeRange);
    },
    [services.data.query.timefilter.timefilter]
  );

  return [getTime, setTime];
};

export const useSyncKibanaTimeFilterTime = (defaults: TimeRange, currentTimeRange: TimeRange) => {
  const [, setTime] = useKibanaTimefilterTime(defaults);

  // On first mount we only want to sync time with Kibana if the derived currentTimeRange (e.g. from URL params)
  // differs from our defaults.
  useMount(() => {
    if (defaults.from !== currentTimeRange.from || defaults.to !== currentTimeRange.to) {
      setTime({ from: currentTimeRange.from, to: currentTimeRange.to });
    }
  });

  // Sync explicit changes *after* mount back to Kibana
  useUpdateEffect(() => {
    setTime({ from: currentTimeRange.from, to: currentTimeRange.to });
  }, [currentTimeRange.from, currentTimeRange.to, setTime]);
};
