/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useFetcher } from '../../../../../observability/public';
import { Ping, SyntheticsMonitor } from '../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';

export const useInvalidMonitors = (errorSummaries?: Ping[]) => {
  const { savedObjects } = useKibana().services;

  const ids = (errorSummaries ?? []).map((summary) => ({
    id: summary.config_id!,
    type: syntheticsMonitorType,
  }));

  return useFetcher(async () => {
    if (ids.length > 0) {
      const response = await savedObjects?.client.bulkResolve<SyntheticsMonitor>(ids);
      if (response) {
        const { resolved_objects: resolvedObjects } = response;
        return resolvedObjects
          .filter((sv) => !Boolean(sv.saved_object.error))
          .map(({ saved_object: savedObject }) => savedObject);
      }
    }
  }, [errorSummaries]);
};
