/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { getScheduleFrequency } from '../lib/rule_api/get_schedule_frequency';

export const useGetScheduleFrequency = () => {
  const { http } = useKibana().services;

  const queryFn = () => {
    return getScheduleFrequency({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading } = useQuery({
    queryKey: ['getScheduleFrequency'],
    queryFn,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isLoading: isLoading || isFetching,
    isError: isError || isLoadingError,
    data,
  };
};
