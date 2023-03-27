/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseFetchActiveAlerts } from '../use_fetch_active_alerts';

export const useFetchActiveAlerts = ({
  sloIds = [],
}: {
  sloIds: string[];
}): UseFetchActiveAlerts => {
  return {
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: sloIds.reduce(
      (acc, sloId, index) => ({
        ...acc,
        ...(index % 2 === 0 && { [sloId]: { count: 2, ruleIds: ['rule-1', 'rule-2'] } }),
      }),
      {}
    ),
  };
};
