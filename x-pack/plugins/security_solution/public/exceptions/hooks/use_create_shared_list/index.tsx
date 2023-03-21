/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { HttpStart } from '@kbn/core/public';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { SHARED_EXCEPTION_LIST_URL } from '../../../../common/constants';

export const createSharedExceptionList = async ({
  name,
  description,
  http,
  signal,
}: {
  http: HttpStart;
  signal: AbortSignal;
  name: string;
  description: string;
}): Promise<ExceptionListSchema> => {
  const res: ExceptionListSchema = await http.post<ExceptionListSchema>(SHARED_EXCEPTION_LIST_URL, {
    body: JSON.stringify({ name, description }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });
  return res;
};

const createSharedExceptionListWithOptionalSignal = withOptionalSignal(createSharedExceptionList);

export const useCreateSharedExceptionListWithOptionalSignal = () =>
  useAsync(createSharedExceptionListWithOptionalSignal);
