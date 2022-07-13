/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useQuery } from 'react-query';
import { useHttp } from '../../lib/kibana';

// import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';

// import { useGlobalTime } from '../use_global_time';
// import { TimelineId } from '../../../../common/types';
// import { useDeepEqualSelector } from '../../hooks/use_selector';
// import { inputsSelectors } from '../../store';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface UseAlertPrevalenceOptions {
  parentEntityId: string | string[] | undefined | null;
  timelineId: string;
  signalIndexName: string | null;
}

interface UserAlertPrevalenceFromProcessTreeResult {
  loading: boolean;
  alertIds: undefined | string[];
  count?: number;
  error: boolean;
}

interface ProcessTreeAlertPrevalenceResponse {
  alertIds: string[];
}

export function useAlertPrevalenceFromProcessTreeActual(
  processEntityId: string
): UserAlertPrevalenceFromProcessTreeResult {
  const http = useHttp();
  const query = useQuery<ProcessTreeAlertPrevalenceResponse>(
    ['getAlertPrevalenceFromProcessTree', processEntityId],
    () => {
      return http.get<ProcessTreeAlertPrevalenceResponse>('/TBD', {
        query: { processEntityId },
      });
    }
  );

  if (query.isLoading) {
    return {
      loading: true,
      error: false,
      alertIds: undefined,
    };
  } else if (query.data) {
    return {
      loading: false,
      error: false,
      alertIds: query.data.alertIds,
    };
  } else {
    return {
      loading: false,
      error: true,
      alertIds: undefined,
    };
  }
}

export const useAlertPrevalenceFromProcessTree = ({
  parentEntityId,
  timelineId,
  signalIndexName,
}: UseAlertPrevalenceOptions): UserAlertPrevalenceFromProcessTreeResult => {
  // const timelineTime = useDeepEqualSelector((state) =>
  //   inputsSelectors.timelineTimeRangeSelector(state)
  // );
  // const globalTime = useGlobalTime();

  // const { to, from } = timelineId === TimelineId.active ? timelineTime : globalTime;
  const [{ loading, alertIds }, setResult] = useState({ loading: true, alertIds: [] as string[] });
  useEffect(() => {
    const t = setTimeout(() => {
      setResult({
        loading: false,
        alertIds: [
          '87f4dc72-3dd6-4cc3-bcd3-6faf42a21667',
          '7619c9a5-744b-406c-b0f7-ae8b683e8c66',
          '42db759c-39b5-4218-92cb-3629ddedf7e5',
        ],
      });
    }, Math.random() * 1500 + 500);
    return () => {
      clearTimeout(t);
    };
  }, []);

  return {
    loading,
    alertIds,
    count: alertIds ? alertIds.length : undefined,
    error: false,
  };
};
