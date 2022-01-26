/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useCallback } from 'react';
import { isEmpty } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { TopAlert, parseAlert } from '../../pages/alerts/';
import { useKibana } from '../../utils/kibana_react';
import { BASE_RAC_ALERTS_API_PATH } from '../../../../rule_registry/common/constants';

export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, unknown>] => {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, unknown> | undefined>(undefined);

  const fetch = useCallback(
    async (ids: string[], abortCtrl: AbortController) => {
      try {
        setLoading(true);
        const response = await http.post<estypes.SearchResponse<Record<string, unknown>>>(
          `${BASE_RAC_ALERTS_API_PATH}/find`,
          {
            body: JSON.stringify({
              query: {
                ids: {
                  values: ids,
                },
              },
              track_total_hits: false,
              size: 10000,
            }),
            signal: abortCtrl.signal,
          }
        );

        if (response) {
          console.log(JSON.stringify(getAlertsGroupedById(response), null, 2));
          setAlerts(getAlertsGroupedById(response));
        }
      } catch (error) {
        console.log('got an error ', error);
        setAlerts(undefined);
      } finally {
        setLoading(false);
      }
    },
    [http]
  );

  const validIds = getValidValues(alertIds);
  console.log('valid ids', validIds);

  useEffect(() => {
    const abortController = new AbortController();
    console.log('rerendering');
    if (shouldFetch(validIds, alerts)) {
      console.log('fetching');
      fetch(validIds, abortController);
    } else {
      console.log('not fetching');
    }

    return () => {
      // abortController.abort();
    };
  }, [fetch, validIds, alerts]);

  return [loading, alerts ?? {}];
};

const getAlertsGroupedById = (
  data: estypes.SearchResponse<Record<string, unknown>>
): Record<string, unknown> => {
  return data.hits.hits.reduce(
    (acc, { _id, _index, _source }) => ({
      ...acc,
      [_id]: {
        _id,
        _index,
        ..._source,
      },
    }),
    {}
  );
};

const getValidValues = (ids: string[]): string[] => {
  return ids.filter((id) => !isEmpty(id));
};

const shouldFetch = (ids: string[], alerts: Record<string, unknown> | undefined): boolean => {
  return !isEmpty(ids) && alerts === undefined;
};

export const useFetchAlertDetail = (alertId: string): [boolean, TopAlert | null] => {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const [alert, setAlert] = useState<TopAlert | null>(null);

  useEffect(() => {
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await http.get<Record<string, unknown>>(BASE_RAC_ALERTS_API_PATH, {
          query: {
            id: alertId,
          },
          signal: abortCtrl.signal,
        });
        if (response) {
          const parsedAlert = parseAlert(observabilityRuleTypeRegistry)(response);

          setAlert(parsedAlert);
        }
      } catch (error) {
        setAlert(null);
      } finally {
        setLoading(false);
      }
    };

    if (!isEmpty(alertId)) {
      fetchData();
    }
    return () => {
      abortCtrl.abort();
    };
  }, [http, alertId, observabilityRuleTypeRegistry]);

  return [loading, alert];
};
