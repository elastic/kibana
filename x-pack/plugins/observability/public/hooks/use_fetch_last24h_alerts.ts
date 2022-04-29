/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { RULE_LOAD_ERROR } from '../pages/rule_details/translations';

interface UseFetchLast24hAlertsProps {
  http: HttpSetup;
  features: string;
}
interface FetchLast24hAlerts {
  isLoadingLast24hAlerts: boolean;
  last24hAlerts: number;
  errorLast24hAlerts: string | undefined;
}

// THIS HOOK IS WIP !!!! due to the bugs below
export function useFetchLast24hAlerts({ http, features }: UseFetchLast24hAlertsProps) {
  const [last24hAlerts, setLast24hAlerts] = useState<FetchLast24hAlerts>({
    isLoadingLast24hAlerts: true,
    last24hAlerts: 0,
    errorLast24hAlerts: undefined,
  });
  const fetchLast24hAlerts = useCallback(async () => {
    try {
      if (!features) return;
      const { index } = await fetchIndexNameAPI({
        http,
        features,
      });
      const res = await fetchLast24hAlertsAPI({ http, index });
    } catch (error) {
      setLast24hAlerts((oldState: FetchLast24hAlerts) => ({
        ...oldState,
        isLoading: false,
        errorLast24hAlerts: RULE_LOAD_ERROR(
          error instanceof Error ? error.message : typeof error === 'string' ? error : ''
        ),
      }));
    }
  }, [http, features]);
  useEffect(() => {
    fetchLast24hAlerts();
  }, [fetchLast24hAlerts]);

  return last24hAlerts;
}

interface IndexName {
  index: string;
}

export async function fetchIndexNameAPI({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<IndexName> {
  const res = await http.get<AsApiContract<IndexName>>(`${BASE_RAC_ALERTS_API_PATH}/index`, {
    query: { features },
  });
  return {
    index: res.index_name[0],
  };
}
export async function fetchLast24hAlertsAPI({
  http,
  index,
}: {
  http: HttpSetup;
  index: string;
}): Promise<any> {
  const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
    body: JSON.stringify({
      // TODO: fix this bug on the API side (adding internal and wildcard) in another PR
      index: `.internal${index}*`,
      query: {
        bool: {
          must: [
            {
              term: {
                'kibana.alert.rule.uuid': '85735100-c552-11ec-a7f8-6bb0cd108662',
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: 'now-24h',
                  lt: 'now',
                },
              },
            },
          ],
        },
      },
      // TODO: this works on DevTool. But the API in returns BadRequest.
      // message: "[request body]: invalid keys \"cardinality,{\"field\":\"kibana.alert.uuid\"}\""
      aggs: {
        alerts_count: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
    }),
  });
  return res;
}
