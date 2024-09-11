/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { UpdateInvestigationNoteParams } from '@kbn/investigation-shared';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateInvestigationNote() {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  return useMutation<
    void,
    ServerError,
    { investigationId: string; noteId: string; note: UpdateInvestigationNoteParams },
    { investigationId: string }
  >(
    ['deleteInvestigationNote'],
    ({ investigationId, noteId, note }) => {
      const body = JSON.stringify(note);
      return http.put<void>(
        `/api/observability/investigations/${investigationId}/notes/${noteId}`,
        { body, version: '2023-10-31' }
      );
    },
    {
      onSuccess: (response, {}) => {
        toasts.addSuccess('Note updated');
      },
      onError: (error, {}, context) => {
        toasts.addError(new Error(error.body?.message ?? 'An error occurred'), { title: 'Error' });
      },
    }
  );
}
