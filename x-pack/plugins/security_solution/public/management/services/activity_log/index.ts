/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseQueryResult, useQuery } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import { useHttp } from '../../../common/lib/kibana';
import { ActivityLog } from '../../../../common/endpoint/types';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';

const ACTIVITY_LOG_API_PATH = `/api/endpoint/action_log/`;

export const useGetActivityLog = ({
  agentId,
  options,
}: {
  agentId: string;
  options: Partial<ActivityLog>;
}): UseQueryResult<ActivityLog, HttpFetchError> => {
  const {
    page = MANAGEMENT_DEFAULT_PAGE + 1,
    pageSize = MANAGEMENT_DEFAULT_PAGE_SIZE,
    startDate = 'now-1d',
    endDate = 'now',
  } = options;

  const http = useHttp();

  return useQuery<ActivityLog, HttpFetchError>(
    ['activityLog', { page, pageSize, startDate, endDate }],
    async () => {
      const response = await http.get<ActivityLog>(`${ACTIVITY_LOG_API_PATH}${agentId}`, {
        query: {
          page,
          page_size: pageSize,
          start_date: startDate,
          end_date: endDate,
        },
      });
      return response;
    },
    {
      keepPreviousData: true,
    }
  );
};
