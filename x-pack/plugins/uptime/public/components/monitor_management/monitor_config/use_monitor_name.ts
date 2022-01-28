/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useFetcher } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';

interface AggsResponse {
  monitorNames: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const [values, setValues] = useState<string[]>([]);

  const { savedObjects } = useKibana().services;

  const { data } = useFetcher(() => {
    const aggs = {
      monitorNames: {
        terms: {
          field: `${syntheticsMonitorType}.attributes.name`,
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
      setValues(
        (data.aggregations as AggsResponse)?.monitorNames.buckets.map(({ key }) =>
          key.toLowerCase()
        )
      );
    }
  }, [data]);

  const hasMonitor = Boolean(search && values?.includes(search.trim().toLowerCase()));

  return { nameAlreadyExists: hasMonitor, validName: hasMonitor ? '' : search };
};
