/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { Environment } from '../../../common/environment_rt';
import { useApmParams } from '../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';
import { useEnvironmentsFetcher } from '../../hooks/use_environments_fetcher';

export const EnvironmentsContext = React.createContext<{
  environment: Environment;
  environments: Environment[];
  status: FETCH_STATUS;
}>({
  environment: ENVIRONMENT_ALL.value,
  environments: [],
  status: FETCH_STATUS.NOT_INITIATED,
});

export function EnvironmentsContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const { path, query } = useApmParams('/*');

  const serviceName = 'serviceName' in path ? path.serviceName : undefined;
  const environment =
    ('environment' in query && (query.environment as Environment)) ||
    ENVIRONMENT_ALL.value;

  const rangeFrom = 'rangeFrom' in query ? query.rangeFrom : undefined;
  const rangeTo = 'rangeTo' in query ? query.rangeTo : undefined;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  const { environments, status } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  return (
    <EnvironmentsContext.Provider
      value={{
        environment,
        environments,
        status,
      }}
    >
      {children}
    </EnvironmentsContext.Provider>
  );
}
