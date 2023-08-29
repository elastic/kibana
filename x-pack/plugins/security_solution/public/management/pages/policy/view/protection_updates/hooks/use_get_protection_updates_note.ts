/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { resolvePathVariables } from '../../../../../../common/utils/resolve_path_variables';
import { PROTECTION_UPDATES_NOTE_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana } from '../../../../../../common/lib/kibana';

export const PROTECTION_UPDATES_NOTE_QUERY_KEY = 'note';

interface UseProtectionUpdatesNote {
  policyId: string;
}

interface NoteResponse {
  note: string;
}

export const useGetProtectionUpdatesNote = ({ policyId }: UseProtectionUpdatesNote) => {
  const { http } = useKibana().services;

  return useQuery<{ data: NoteResponse }, unknown, NoteResponse>(
    [PROTECTION_UPDATES_NOTE_QUERY_KEY],
    () =>
      http.get(resolvePathVariables(PROTECTION_UPDATES_NOTE_ROUTE, { policy_id: policyId }), {
        version: '2023-10-31',
      }),
    {
      keepPreviousData: true,
      enabled: !!policyId,
      retry: false,
    }
  );
};
