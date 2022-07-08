/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { CSP_LATEST_FINDINGS_DATA_VIEW, ES_PIT_ROUTE_PATH } from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { FINDINGS_PIT_KEEP_ALIVE } from '../constants';

export const useFindingsEsPit = (queryKey: string) => {
  // Using a reference for the PIT ID to avoid re-rendering when it changes
  const pitIdRef = useRef<string>();
  // Using this state as an internal control to ensure we run the query to open the PIT once and only once
  const [isPitIdSet, setPitIdSet] = useState(false);
  const setPitId = useCallback(
    (newPitId: string) => {
      pitIdRef.current = newPitId;
      setPitIdSet(true);
    },
    [pitIdRef, setPitIdSet]
  );

  const { http } = useKibana().services;
  const pitQuery = useQuery(
    ['findingsPitQuery', queryKey],
    () =>
      http.post<string>(ES_PIT_ROUTE_PATH, {
        query: { index_name: CSP_LATEST_FINDINGS_DATA_VIEW, keep_alive: FINDINGS_PIT_KEEP_ALIVE },
      }),
    {
      enabled: !isPitIdSet,
      onSuccess: (pitId) => {
        setPitId(pitId);
      },
      cacheTime: 0,
    }
  );

  return { pitIdRef, setPitId, pitQuery };
};
