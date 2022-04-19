/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import { useMonitorId } from '../../../hooks';

interface AggsResponse {
  monitorNames: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const [values, setValues] = useState<string[]>([]);

  const monitorId = useMonitorId();

  const { savedObjects } = useKibana().services;

  const { data } = useFetcher(() => {
    const aggs = {
      monitorNames: {
        terms: {
          field: `${syntheticsMonitorType}.attributes.name.keyword`,
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

  useEffect(() => {
    if (data?.aggregations) {
      const newValues = (data.aggregations as AggsResponse)?.monitorNames.buckets.map(({ key }) =>
        key.toLowerCase()
      );
      if (monitorId && newValues.includes(search.toLowerCase())) {
        setValues(newValues.filter((val) => val !== search.toLowerCase()));
      } else {
        setValues(newValues);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, monitorId]);

  const hasMonitor = Boolean(
    search && values && values.length > 0 && values?.includes(search.trim().toLowerCase())
  );

  return { nameAlreadyExists: hasMonitor, validName: hasMonitor ? '' : search };
};
