/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseFetchActiveAlerts } from '../use_fetch_active_alerts';
import { ActiveAlerts } from '../active_alerts';

export const useFetchActiveAlerts = ({
  sloIdsAndInstanceIds = [],
}: {
  sloIdsAndInstanceIds: Array<[string, string]>;
}): UseFetchActiveAlerts => {
  const data = sloIdsAndInstanceIds.reduce(
    (acc, item, index) => ({
      ...acc,
      ...(index % 2 === 0 && { [item.join('|')]: 2 }),
    }),
    {}
  );
  return {
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: new ActiveAlerts(data),
  };
};
