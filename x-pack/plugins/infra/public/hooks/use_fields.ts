/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import DateMath from '@elastic/datemath';
import { AvailableFieldsResponse } from '../../server/routes/available_fields/types';
import { fetch } from '../utils/fetch';

export function useFields(indexPattern: string, timeField: string, from: string, to: string) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AvailableFieldsResponse | null>(null);

  const fromTime = DateMath.parse(from);
  const toTime = DateMath.parse(to, { roundUp: true });

  if (!toTime || !fromTime) {
    throw new Error('Unable to parse timerange');
  }

  useEffect(
    () => {
      (async () => {
        setLoading(true);
        try {
          const response = await fetch.post<AvailableFieldsResponse>(
            '../api/infra/available_fields',
            { indexPattern, timeField, to: toTime.valueOf(), from: fromTime.valueOf() }
          );
          setData(response.data);
          setError(null);
        } catch (e) {
          setError(e);
          setLoading(false);
        }
        setLoading(false);
      })();
    },
    [indexPattern, timeField, from, to]
  );
  return { fields: (data && data.fields) || [], loading, error };
}
