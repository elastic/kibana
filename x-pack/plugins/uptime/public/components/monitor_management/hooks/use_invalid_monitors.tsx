/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';
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
          .filter((sv) => {
            if (sv.saved_object.updatedAt) {
              const errorSummary = errorSummaries?.find(
                (summary) => summary.config_id === sv.saved_object.id
              );
              if (errorSummary) {
                return moment(sv.saved_object.updatedAt).isBefore(moment(errorSummary.timestamp));
              }
            }

            return !Boolean(sv.saved_object.error);
          })
          .map(({ saved_object: savedObject }) => ({
            ...savedObject,
            updated_at: savedObject.updatedAt!,
          }));
      }
    }
  }, [errorSummaries]);
};
