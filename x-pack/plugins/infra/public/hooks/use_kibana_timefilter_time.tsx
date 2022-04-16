/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import useMount from 'react-use/lib/useMount';
import { TimeRange, TimefilterContract } from '@kbn/data-plugin/public';
import { useKibanaContextForPlugin } from './use_kibana';

export const useKibanaTimefilterTime = ({
  from: fromDefault,
  to: toDefault,
}: TimeRange): [typeof getTime, TimefilterContract['setTime']] => {
  const { services } = useKibanaContextForPlugin();

  const getTime = useCallback(() => {
    const timefilterService = services.data.query.timefilter.timefilter;
    return timefilterService.isTimeTouched()
      ? timefilterService.getTime()
      : { from: fromDefault, to: toDefault };
  }, [services.data.query.timefilter.timefilter, fromDefault, toDefault]);

  return [getTime, services.data.query.timefilter.timefilter.setTime];
};

/**
 * Handles one or two way syncing with the Kibana time filter service.
 *
 * For one way syncing the time range will be synced back to the time filter service
 * on mount *if* it differs from the defaults, e.g. a URL param.
 * Future updates, after mount, will also be synced back to the time filter service.
 *
 * For two way syncing, in addition to the above, changes *from* the time filter service
 * will be sycned to the solution, e.g. there might be an embeddable on the page that
 * fires an action that hooks into the time filter service.
 */
export const useSyncKibanaTimeFilterTime = (
  defaults: TimeRange,
  currentTimeRange: TimeRange,
  setTimeRange?: (timeRange: TimeRange) => void
) => {
  const { services } = useKibanaContextForPlugin();
  const [getTime, setTime] = useKibanaTimefilterTime(defaults);

  // On first mount we only want to sync time with Kibana if the derived currentTimeRange (e.g. from URL params)
  // differs from our defaults.
  useMount(() => {
    if (defaults.from !== currentTimeRange.from || defaults.to !== currentTimeRange.to) {
      setTime({ from: currentTimeRange.from, to: currentTimeRange.to });
    }
  });

  // Sync explicit changes *after* mount from the solution back to Kibana
  useUpdateEffect(() => {
    setTime({ from: currentTimeRange.from, to: currentTimeRange.to });
  }, [currentTimeRange.from, currentTimeRange.to, setTime]);

  // *Optionally* sync time filter service changes back to the solution.
  // For example, an embeddable might have a time range action that hooks into
  // the time filter service.
  useEffect(() => {
    const sub = services.data.query.timefilter.timefilter.getTimeUpdate$().subscribe(() => {
      if (setTimeRange) {
        const timeRange = getTime();
        setTimeRange(timeRange);
      }
    });

    return () => sub.unsubscribe();
  }, [getTime, setTimeRange, services.data.query.timefilter.timefilter]);
};
