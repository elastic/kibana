/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';

import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

export const useFetchParams = () => {
  const { serviceName, transactionType } = useApmServiceContext();

  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  return useMemo(
    () => ({
      serviceName,
      transactionName,
      transactionType,
      kuery,
      environment,
      start,
      end,
    }),
    [
      serviceName,
      transactionName,
      transactionType,
      kuery,
      environment,
      start,
      end,
    ]
  );
};
