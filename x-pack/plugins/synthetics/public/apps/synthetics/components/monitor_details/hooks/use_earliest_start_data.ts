/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMemo } from 'react';
import moment from 'moment';
import { useSelectedMonitor } from './use_selected_monitor';
import { useMonitorQueryId } from './use_monitor_query_id';

export const useEarliestStartDate = () => {
  const monitorId = useMonitorQueryId();

  const { monitorId: soId } = useParams<{ monitorId: string }>();

  const { savedObjects } = useKibana().services;

  const { monitorSO } = useSelectedMonitor();

  const { data: createdAt, loading } = useFetcher(async () => {
    if (monitorSO) {
      return monitorSO.created_at;
    }
    const so = await savedObjects?.client?.get('synthetics-monitor', soId);
    return so?.createdAt;
  }, [monitorId]);

  return useMemo(() => {
    if (createdAt) {
      const diff = moment(createdAt).diff(moment().subtract(30, 'day'), 'days');
      if (diff > 0) {
        return { from: createdAt, loading };
      }
    }
    return { from: 'now-30d/d', loading };
  }, [createdAt, loading]);
};
