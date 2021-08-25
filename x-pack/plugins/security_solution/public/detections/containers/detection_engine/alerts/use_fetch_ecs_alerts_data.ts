/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash';

import {
  buildAlertsQuery,
  formatAlertToEcsSignal,
} from '../../../../cases/components/case_view/helpers';
import { Ecs } from '../../../../../common/ecs';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { KibanaServices } from '../../../../common/lib/kibana';

export const useFetchEcsAlertsData = ({
  alertIds,
  skip,
  onError,
}: {
  alertIds?: string[] | null | undefined;
  skip?: boolean;
  onError?: (e: Error) => void;
}): { isLoading: boolean | null; alertsEcsData: Ecs[] | null } => {
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const [alertsEcsData, setAlertEcsData] = useState<Ecs[] | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchAlert = async () => {
      try {
        setIsLoading(true);
        const alertResponse = await KibanaServices.get().http.fetch<
          estypes.SearchResponse<{ '@timestamp': string; [key: string]: unknown }>
        >(DETECTION_ENGINE_QUERY_SIGNALS_URL, {
          method: 'POST',
          body: JSON.stringify(buildAlertsQuery(alertIds ?? [])),
        });

        setAlertEcsData(
          alertResponse?.hits.hits.reduce<Ecs[]>(
            (acc, { _id, _index, _source = {} }) => [
              ...acc,
              {
                ...formatAlertToEcsSignal(_source),
                _id,
                _index,
                timestamp: _source['@timestamp'],
              },
            ],
            []
          ) ?? []
        );
      } catch (e) {
        if (isSubscribed) {
          if (onError) {
            onError(e as Error);
          }
        }
      }
      if (isSubscribed) {
        setIsLoading(false);
      }
    };

    if (!isEmpty(alertIds) && !skip) {
      fetchAlert();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [alertIds, onError, skip]);

  return {
    isLoading,
    alertsEcsData,
  };
};
