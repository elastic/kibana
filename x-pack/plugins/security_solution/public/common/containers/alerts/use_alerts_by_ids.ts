/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';

interface UseAlertByIdsOptions {
  alertIds: string[];
  fields?: string[];
}

interface Hit {
  fields: Record<string, string[]>;
}

interface UserAlertByIdsResult {
  loading: boolean;
  error: boolean;
  data?: Hit[];
}

/**
 * Fetches the alert documents associated to the ids that are passed.
 * By default it fetches all fields but they can be limited by passing
 * the `fields` parameter.
 */
export const useAlertsByIds = ({
  alertIds,
  fields = ['*'],
}: UseAlertByIdsOptions): UserAlertByIdsResult => {
  const [initialQuery] = useState(() => generateAlertByIdsQuery(alertIds, fields));

  const { loading, data, setQuery } = useQueryAlerts<Hit, unknown>({
    query: initialQuery,
    queryName: ALERTS_QUERY_NAMES.BY_ID,
  });

  useEffect(() => {
    setQuery(generateAlertByIdsQuery(alertIds, fields));
  }, [setQuery, alertIds, fields]);

  const error = !loading && data === undefined;

  return {
    loading,
    error,
    data: data?.hits.hits,
  };
};

const generateAlertByIdsQuery = (alertIds: string[], fields: string[]) => {
  return {
    fields,
    _source: false,
    query: {
      ids: {
        values: alertIds,
      },
    },
  };
};
