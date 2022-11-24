/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ImportExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { HttpStart } from '@kbn/core/public';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

export const importExceptionList = async ({
  file,
  http,
  signal,
  overwrite,
  overwriteExceptions,
  asNewList,
}: {
  // TODO: Replace these with kbn packaged versions once we have those available to us
  // These originally came from this location below before moving them to this hacked "any" types:
  // import { HttpStart, NotificationsStart } from '../../../../../src/core/public';
  http: HttpStart;
  signal: AbortSignal;
  file: File;
  overwrite: boolean;
  overwriteExceptions: boolean;
  asNewList: boolean;
}): Promise<ImportExceptionsResponseSchema> => {
  const formData = new FormData();
  formData.append('file', file as Blob);

  const res = await http.post<ImportExceptionsResponseSchema>(`${EXCEPTION_LIST_URL}/_import`, {
    body: formData,
    query: { overwrite, overwrite_exceptions: overwriteExceptions, as_new_list: asNewList },
    headers: { 'Content-Type': undefined },
    method: 'POST',
    signal,
  });
  return res;
};

const importListWithOptionalSignal = withOptionalSignal(importExceptionList);

export const useImportExceptionList = () => useAsync(importListWithOptionalSignal);
