/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { CSP_LATEST_FINDINGS_DATA_VIEW, ES_PIT_ROUTE_PATH } from '../../../common/constants';
import { useKibana } from '../../common/hooks/use_kibana';
import { FINDINGS_PIT_KEEP_ALIVE } from './constants';

export const useFindingsEsPit = (setPitId: (newPitId: string) => void) => {
  const { http } = useKibana().services;
  return useQuery(
    'findingsPitQuery',
    () =>
      http.post<string>(ES_PIT_ROUTE_PATH, {
        query: { index_name: CSP_LATEST_FINDINGS_DATA_VIEW, keep_alive: FINDINGS_PIT_KEEP_ALIVE },
      }),
    {
      // We want this query to only run once and only once when the page is mounted, so we disable it and consumers
      //  explicitly call `refetch`
      enabled: false,
      onSuccess: (pitId) => {
        setPitId(pitId);
      },
    }
  );
};
