/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation } from '@tanstack/react-query';
import {
  CreateInvestigationNoteInput,
  CreateInvestigationNoteResponse,
} from '@kbn/investigation-shared';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useAddInvestigationNote() {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    CreateInvestigationNoteResponse,
    ServerError,
    { investigationId: string; note: CreateInvestigationNoteInput },
    { investigationId: string }
  >(
    ['addInvestigationNote'],
    ({ investigationId, note }) => {
      const body = JSON.stringify(note);
      return http.post<CreateInvestigationNoteResponse>(
        `/api/observability/investigations/${investigationId}/notes`,
        { body, version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, {}) => {
        // TODO: clear investigationNotes key from queryClient, and push new note to the internal store.
        // console.log(response);
        toasts.addSuccess('Note saved');
      },
      onError: (error, {}, context) => {
        // console.log(error);
      },
    }
  );
}
