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
import { useMonitorQueryId } from './use_monitor_query_id';

export const useEarliestStartDate = () => {
  const monitorId = useMonitorQueryId();

  const { monitorId: soId } = useParams<{ monitorId: string }>();

  const { savedObjects } = useKibana().services;

  const { data: dataFromSO, loading } = useFetcher(async () => {
    return savedObjects?.client?.get('synthetics-monitor', soId);
  }, [monitorId]);

  return useMemo(() => {
    if (dataFromSO?.createdAt) {
      const diff = moment(dataFromSO?.createdAt).diff(moment().subtract(30, 'day'), 'days');
      if (diff > 0) {
        return { from: dataFromSO?.createdAt, loading };
      }
    }
    return { from: 'now-30d/d', loading };
  }, [dataFromSO?.createdAt, loading]);
};
