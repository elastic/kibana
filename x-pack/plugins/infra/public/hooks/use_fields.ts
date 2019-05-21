/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { AvailableFieldsResponse } from '../../server/routes/available_fields/types';
import { fetch } from '../utils/fetch';

export function useFields(indexPattern: string, timeField: string) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AvailableFieldsResponse | null>(null);
  useEffect(
    () => {
      (async () => {
        setLoading(true);
        try {
          const response = await fetch.post<AvailableFieldsResponse>(
            '../api/infra/available_fields',
            {
              indexPattern,
              timeField,
            }
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
    [indexPattern, timeField]
  );
  return { fields: (data && data.fields) || [], loading, error };
}
