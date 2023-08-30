/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PROTECTION_UPDATES_NOTE_QUERY_KEY } from './use_get_protection_updates_note';
import { useKibana } from '../../../../../../common/lib/kibana';
import { resolvePathVariables } from '../../../../../../common/utils/resolve_path_variables';
import { PROTECTION_UPDATES_NOTE_ROUTE } from '../../../../../../../common/endpoint/constants';

interface UseProtectionUpdatesNote {
  packagePolicyId: string;
}

interface NoteResponse {
  note: string;
}

export const useCreateProtectionUpdatesNote = ({ packagePolicyId }: UseProtectionUpdatesNote) => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    { data: NoteResponse },
    { body: { error: string; message: string } },
    NoteResponse
  >(
    (payload) =>
      http.post(
        resolvePathVariables(PROTECTION_UPDATES_NOTE_ROUTE, { policy_id: packagePolicyId }),
        {
          version: '2023-10-31',
          body: JSON.stringify(payload),
        }
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([PROTECTION_UPDATES_NOTE_QUERY_KEY]);
      },
    }
  );
};
