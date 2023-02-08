/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment';
import { useRefreshedRange } from '../../../hooks';
import { useSelectedMonitor } from './use_selected_monitor';

export const useMonitorRangeFrom = () => {
  const { monitor, loading } = useSelectedMonitor();

  const { from, to } = useRefreshedRange(30, 'days');

  return useMemo(() => {
    if (monitor?.created_at) {
      const diff = moment(monitor?.created_at).diff(moment().subtract(30, 'day'), 'days');
      if (diff > 0) {
        return { to, from: monitor?.created_at, loading };
      }
    }
    return { to, from, loading };
  }, [monitor?.created_at, to, from, loading]);
};
