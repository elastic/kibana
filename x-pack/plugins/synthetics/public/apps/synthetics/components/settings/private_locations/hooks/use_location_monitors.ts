/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  monitorAttributes,
  syntheticsMonitorType,
} from '../../../../../../../common/types/saved_objects';

interface AggsResponse {
  locations: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export const useLocationMonitors = () => {
  const { savedObjects } = useKibana().services;

  const { data, loading } = useFetcher(() => {
    const aggs = {
      locations: {
        terms: {
          field: `${monitorAttributes}.locations.id`,
          size: 10000,
        },
      },
    };
    return savedObjects?.client.find<unknown, typeof aggs>({
      type: syntheticsMonitorType,
      perPage: 0,
      aggs,
    });
  }, []);

  return useMemo(() => {
    if (data?.aggregations) {
      const newValues = (data.aggregations as AggsResponse)?.locations.buckets.map(
        ({ key, doc_count: count }) => ({ id: key, count })
      );

      return { locationMonitors: newValues, loading };
    }
    return { locationMonitors: [], loading };
  }, [data, loading]);
};
