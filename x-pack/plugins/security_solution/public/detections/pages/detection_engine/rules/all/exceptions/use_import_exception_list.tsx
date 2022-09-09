/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { importExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { HttpStart } from '@kbn/core/public';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

export const importExceptionList = async ({
  file,
  http,
  signal,
}: {
  // TODO: Replace these with kbn packaged versions once we have those available to us
  // These originally came from this location below before moving them to this hacked "any" types:
  // import { HttpStart, NotificationsStart } from '../../../../../src/core/public';
  http: HttpStart;
  signal: AbortSignal;
  file: File;
}): Promise<typeof importExceptionsResponseSchema> => {
  const formData = new FormData();
  formData.append('file', file as Blob);

  return http.post<typeof importExceptionsResponseSchema>(`${EXCEPTION_LIST_URL}/_import`, {
    body: formData,
    headers: { 'Content-Type': undefined },
    method: 'POST',
    signal,
  });
};

const importListWithOptionalSignal = withOptionalSignal(importExceptionList);

export const useImportExceptionList = () => useAsync(importListWithOptionalSignal);
